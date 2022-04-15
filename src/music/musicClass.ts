import "dotenv/config";
import { client } from "../index";
import { Guild, TextChannel } from "discord.js";
import ytdl from "ytdl-core";
import { M, PM } from "../aliases/discord.js.js";
import { guild_type } from "../database/obj/guild";
import { HttpsProxyAgent } from "https-proxy-agent";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, PlayerSubscription, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import getchannel from "./getchannel";
import internal from "stream";

export const agent = new HttpsProxyAgent(process.env.PROXY!);
export const BOT_LEAVE_TIME = (process.env.BOT_LEAVE ? Number(process.env.BOT_LEAVE) : 10)*60*1000;

export interface nowplay {
  title: string;
  author: string;
  duration: string;
  url: string;
  image: string;
  player: string;
};

export default class Music {
  guild: Guild;
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
  queuenumber: number[];
  players: [ PlayerSubscription | undefined | null, AudioResource<any> | undefined | null ];
  timeout: NodeJS.Timeout | undefined;
  notleave: NodeJS.Timeout | undefined;
  checkautopause: boolean;

  constructor(guild: Guild) {
    this.guild = guild;
    this.playing = false;
    this.nowplaying = null;
    this.queue = [];
    this.queuenumber = [];
    this.players = [ undefined, undefined ];
    this.timeout = undefined;
    this.timeout = undefined;
    this.checkautopause = false;
  }

  setqueuenumber(getqueuenumber: number[]) {
    this.queuenumber = getqueuenumber;
  }

  setqueue(queue: nowplay[], queuenumber?: number[]) {
    if (queuenumber) this.queuenumber = queuenumber;
    this.queue = queue;
  }

  async getdata(message: M | PM, guildDB: guild_type, getsearch?: ytdl.videoInfo): Promise<nowplay | undefined> {
    let data: nowplay | undefined = undefined;
    if (getsearch) {
      var getinfo = getsearch.videoDetails;
      data = {
        title: getinfo.title,
        author: getinfo.author!.name,
        duration: getinfo.lengthSeconds,
        player: `<@${message.author!.id}>`,
        url: getinfo.video_url,
        image: (getinfo.thumbnails[0].url) ? getinfo.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`
      };
    } else {
      let num = this.queuenumber.shift();
      if (num === undefined || num === null || num === NaN) {
        if (guildDB.options.recommend) {
          data = await this.getrecommend(message, guildDB);
        } else {
          data = undefined;
        }
      } else {
        data = this.queue[num-1];
      }
    }
    return data;
  }

  async play(message: M | PM, getsearch?: ytdl.videoInfo) {
    let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (!guildDB) return this.stop(message.guild!, true);
    const channelid = guildDB.channelId;
    const guildid = message.guildId!;
    const msgchannel = message.guild?.channels.cache.get(channelid) as TextChannel;
    let voicechannel = getchannel(message);
    if (voicechannel) {
      if (getVoiceConnection(message.guildId!)) await entersState(getVoiceConnection(message.guildId!)!, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      let data: nowplay | undefined = await this.getdata(message, guildDB, getsearch);
      if (this.timeout) clearTimeout(this.timeout);
      if (data) {
        const getq = [ "maxresdefault", "sddefault", "hqdefault", "mqdefault", "default", "0", "1", "2", "3" ];
        data.image = data.image.replace(new RegExp(`${getq.join('\\.|')}\\.`, 'g'), 'hqdefault.').replace(/\?.+/g,"").trim();
        const checkarea = await this.getarea(data.url);
        if (checkarea) {
          this.nowplaying = data;
        } else {
          msgchannel.send({ embeds: [
            client.mkembed({
              title: `오류발생`,
              description: '현재 지역에서 영상을 재생할 수 없습니다.',
              footer: { text: `Area error` },
              color: "DARK_RED"
            })
          ] }).then(m => client.msgdelete(m, 3000, true));
          return this.skipPlayer(message);
        }
        this.nowplaying = data;
      } else {
        return this.waitend(message.guild!);
      }
      this.playing = true;
      setmsg(message.guild!);
      const connection = joinVoiceChannel({
        adapterCreator: message.guild?.voiceAdapterCreator! as DiscordGatewayAdapterCreator,
        guildId: message.guildId!,
        channelId: voicechannel.id
      });
      const Player = createAudioPlayer();
      connection.setMaxListeners(0);
      Player.setMaxListeners(0);
      let ytsource: internal.Readable | undefined = undefined;
      try {
        ytsource = ytdl(data.url, {
          filter: "audioonly",
          quality: "highestaudio",
          highWaterMark: 1 << 25,
          dlChunkSize: 0,
          requestOptions: { agent }
        }).on('error', (err) => {
          if (client.debug) console.log('ytdl-core오류1:', err);
          return undefined;
        });
      } catch {
        ytsource = undefined;
      }
      if (!ytsource) {
        connection.destroy();
        await this.stopPlayer();
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '영상을 찾을수 없습니다.',
            footer: { text: `not found ytsource` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        return this.skipPlayer(message);
      }
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      } catch {
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '재생시도중 오류발생',
            footer: { text: `not set entersState` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        return this.skipPlayer(message);
      }
      const resource = createAudioResource(ytsource, { inlineVolume: true, inputType: StreamType.Arbitrary });
      resource.volume?.setVolumeDecibels(5);
      resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 100 : 0.7);
      Player.play(resource);
      const subscription = connection.subscribe(Player);
      this.players = [ subscription, resource ];
      Player.on(AudioPlayerStatus.Idle, async (P) => {
        // 봇 노래 재생 끝났을때
        Player.stop();
        await entersState(connection, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
        return this.play(message, undefined);
      });
      connection.on('error', (err) => {
        if (client.debug) console.log('connection오류:', err);
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '영상을 재생할 수 없습니다.\n다시 시도해주세요.',
            footer: { text: `connection error` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        return this.stopPlayer();
      });
      Player.on('error', (err) => {
        if (client.debug) console.log('Player오류:', err);
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '영상을 재생할 수 없습니다.\n다시 시도해주세요.',
            footer: { text: `Player error` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        return this.stopPlayer();
      });
    } else {
      return message.channel.send({ embeds: [
        client.mkembed({
          title: '음성채널을 찾을수 없습니다.',
          description: '음성채널에 들어가서 사용해주세요.',
          color: "DARK_RED"
        })
      ] }).then(m => client.msgdelete(m, 1));
    }
  }

  pause(guild: Guild) {
    if (this.players[0]) {
      if (this.players[0].player.state.status === AudioPlayerStatus.Playing) {
        this.players[0].player.pause();
        entersState(getVoiceConnection(guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
        if (this.notleave) clearInterval(this.notleave);
        this.notleave = setInterval(() => {
          if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) {
            entersState(getVoiceConnection(guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
          } else {
            if (this.notleave) clearInterval(this.notleave);
          }
        }, 1000*60);
        setmsg(guild, true);
      } else {
        this.players[0].player.unpause();
        if (this.notleave) {
          clearInterval(this.notleave);
          this.notleave = undefined;
        }
        setmsg(guild);
      }
    }
  }

  autopause(guild: Guild) {
    if (this.checkautopause) {
      if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) {
        this.checkautopause = false;
        this.pause(guild);
      }
    } else {
      if (this.players[0]?.player.state.status === AudioPlayerStatus.Playing) {
        this.checkautopause = true;
        this.pause(guild);
      }
    }
  }

  setVolume(number: number) {
    if (this.players[1]) {
      this.players[1].volume?.setVolume(number / 100);
    }
  }

  waitPlayer() {
    if (this.players[0]) this.players[0].player.stop();
  }
  
  async waitend(guild: Guild) {
    if (!client.getmc(guild).playing) return;
    this.waitPlayer();
    this.stop(guild, false);
    this.timeout = setTimeout(() => {
      if (!client.getmc(guild).playing) return this.stop(guild, true);
    }, BOT_LEAVE_TIME);
    return;
  }

  async skipPlayer(message: M | PM) {
    if (getVoiceConnection(message.guildId!)) {
      await entersState(getVoiceConnection(message.guildId!)!, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      this.play(message, undefined);
    }
  }

  async stop(guild: Guild, leave: boolean) {
    let guildDB = await MDB.module.guild.findOne({ id: guild.id });
    if (!guildDB) return;
    this.playing = false;
    this.queue = [];
    this.queuenumber = [];
    this.nowplaying = null;
    setmsg(guild);
    if (leave) getVoiceConnection(guild.id)?.disconnect();
  }
  
  stopPlayer() {
    if (this.players[0]) {
      this.players[0].player.stop();
      this.players = [ undefined, undefined ];
    }
  }
  
  async getarea(url: string): Promise<boolean> {
    const info = await ytdl.getInfo(url, {
      lang: "KR",
      requestOptions: { agent }
    }).catch((err) => {
      return undefined;
    });
    if (info && info.videoDetails) {
      return info.videoDetails.availableCountries.includes('KR');
    }
    return false;
  }
  
  async getrecommend(message: M | PM, guildDB: guild_type): Promise<nowplay | undefined> {
    if (guildDB.options.recommend) {
      const mc = client.getmc(message.guild!);
      if (mc.nowplaying && mc.nowplaying.url.length > 0) {
        const recommend = await ytdl.getInfo(mc.nowplaying.url, {
          lang: "KR",
          requestOptions: { agent }
        });
        if (recommend && recommend.related_videos && recommend.related_videos.length > 0) {
          recommend.related_videos.sort((a, b) => {
            if (a.isLive) return 1;
            let c1 = a.length_seconds! - b.length_seconds!;
            let c2 = Number(b.view_count!) - Number(a.view_count!);
            if (c1 < 0 && c2 < 0) return -1;
            if (c1 >= 0 || c2 < 0) return 0;
            return 1;
          });
          let data = recommend.related_videos[Math.round(Math.random()*2)];
          var output: nowplay = {
            title: data.title!,
            duration: data.length_seconds!.toString(),
            author: (data.author as ytdl.Author).name ? (data.author as ytdl.Author).name : (data.author as String).toString(),
            image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
            player: `자동재생으로 재생됨`,
            url: `https://www.youtube.com/watch?v=` + data.id!
          }
          return output;
        }
      }
    }
    return undefined;
  }
}