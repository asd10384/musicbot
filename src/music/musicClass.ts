import "dotenv/config";
import { client } from "../index";
import { Guild, MessageEmbed, TextChannel } from "discord.js";
import { I, M, PM } from "../aliases/discord.js.js";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, demuxProbe, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, PlayerSubscription, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import ytdl from "ytdl-core";
import ytpl from "ytpl";
import ytsr from "ytsr";
import internal from "stream";
import nowdate from "../function/nowdate";
import MDB, { guild_type } from "../database/Mysql";
import { HttpsProxyAgent } from "https-proxy-agent";
import { fshuffle } from "./shuffle";
import { parmas } from "./music";
import getchannel from "./getchannel";
import checkurl from "./checkurl";
import checkvideo from "./checkvideo";

export const agent = new HttpsProxyAgent(process.env.PROXY!);
export const BOT_LEAVE_TIME = (process.env.BOT_LEAVE ? Number(process.env.BOT_LEAVE) : 10)*60*1000;
const LOGSC = process.env.LOGSC ? process.env.LOGSC.trim().split(",").length === 2 ? process.env.LOGSC.trim().split(",") : undefined : undefined;


export interface nowplay {
  title: string;
  author: string;
  duration: string;
  url: string;
  image: string;
  player: string;
};

type Vtype = "video" | "playlist" | "database";
type Etype = "notfound" | "added" | "livestream";

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
  inputplaylist: boolean;

  constructor(guild: Guild) {
    this.guild = guild;
    this.playing = false;
    this.nowplaying = null;
    this.queue = [];
    this.queuenumber = [];
    this.players = [ undefined, undefined ];
    this.timeout = undefined;
    this.notleave = undefined;
    this.checkautopause = false;
    this.inputplaylist = false;
  }

  setqueuenumber(getqueuenumber: number[]) {
    this.queuenumber = getqueuenumber;
  }

  setqueue(queue: nowplay[], queuenumber?: number[]) {
    if (queuenumber) this.queuenumber = queuenumber;
    this.queue = queue;
  }

  setinputplaylist(getinputplaylist: boolean) {
    this.inputplaylist = getinputplaylist;
  }

  async search(message: M, text: string, parmas?: parmas): Promise<[ytdl.videoInfo, Vtype, M | undefined ] | [ undefined, string, M | undefined ]> {
    if (this.inputplaylist) return [ undefined, `?????? ????????????????????? ????????????????????????.\n????????? ??????????????????.`, undefined ];
    let url = checkurl(text);
    if (url.video) {
      let yid = url.video[1].replace(/\&.+/g,'');
      let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${yid}` });
      if (checkv[0]) return [ checkv[1], "video", undefined ];
      return [ undefined, checkv[1], undefined ];
    } else if (url.list) {
      let guildDB = await MDB.get.guild(this.guild);
      if (!guildDB) return [ undefined, `?????????????????? ??????\n????????????????????????.`, undefined ];
      this.inputplaylist = true;
      const addedembed = await message.channel.send({ embeds: [
        client.mkembed({
          description: `<@${message.author.id}> ?????????????????? ?????????...\n(????????? ????????? ???????????? ??????????????????.)`,
          color: client.embedcolor
        })
      ] }).catch((err) => {
        return undefined;
      });
      let list = await ytpl(url.list[1].replace(/\&.+/g,''), {
        gl: "KR",
        requestOptions: { agent },
        limit: 50000 // (guildDB.options.listlimit) ? guildDB.options.listlimit : 300
      }).catch((err) => {
        if (client.debug) console.log(err);
        return undefined;
      });
      addedembed?.delete().catch((err) => {});
      if (list && list.items && list.items.length > 0) {
        if (client.debug) console.log(this.guild.name, list.title, list.items.length, (guildDB.options.listlimit) ? guildDB.options.listlimit : 300);
        this.sendlog(`${list.title}: ${list.items.length}`);
        const addembed = await message.channel.send({ embeds: [
          client.mkembed({
            title: `\` ${list.title} \` ?????????????????? ?????????...`,
            description: `??????????????? \` ${list.items.length} \` ??? ${parmas?.shuffle ? "????????? " : ""}?????????`,
            color: client.embedcolor
          })
        ] }).catch((err) => {
          return undefined;
        });
        if (parmas?.shuffle) list.items = await fshuffle(list.items);
        if (this.playing) {
          this.queuenumber = this.queuenumber.concat(list.items.map((data, i) => {
            return this.queue.length+i;
          }));
          this.queue = this.queue.concat(list.items.map((data) => {
            return {
              title: data.title,
              duration: data.durationSec!.toString(),
              author: data.author.name,
              url: data.shortUrl,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          }));
          this.setmsg();
          this.inputplaylist = false;
          return [ undefined, `????????????????????? ????????? ????????????.`, addembed ];
        } else {
          const output = list.items.shift()!;
          this.queuenumber = this.queuenumber.concat(list.items.map((data, i) => {
            return this.queue.length+i;
          }));
          this.queue = this.queue.concat(list.items.map((data) => {
            return {
              title: data.title,
              duration: data.durationSec!.toString(),
              author: data.author.name,
              url: data.shortUrl,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          }));
          let checkv = await checkvideo({ url: output.shortUrl });
          this.inputplaylist = false;
          if (checkv[0]) return [ checkv[1], "video", addembed ];
          return [ undefined, checkv[1], addembed ];
        }
      } else {
        this.inputplaylist = false;
        return [ undefined, `????????????????????? ????????? ????????????.`, undefined ];
      }
    } else {
      let list = await ytsr(text, {
        gl: 'KO',
        requestOptions: { agent },
        limit: 1
      });
      if (list && list.items && list.items.length > 0) {
        list.items = list.items.filter((item) => item.type === "video");
        if (list.items.length > 0 && list.items[0].type === "video") {
          let checkv = await checkvideo({ url: list.items[0].url });
          if (checkv[0]) return [ checkv[1], "video", undefined ];
          return [ undefined, checkv[1], undefined ];
        }
      }
      this.inputplaylist = false;
      return [ undefined, `????????? ????????? ????????? ????????????.`, undefined ];
    }
  }

  async addqueue(message: M, getsearch: ytdl.videoInfo) {
    let getinfo = getsearch.videoDetails;
    this.queuenumber.push(this.queue.length);
    this.queue.push({
      title: getinfo.title,
      duration: getinfo.lengthSeconds,
      author: getinfo.author!.name,
      url: getinfo.video_url,
      image: (getinfo.thumbnails.length > 0 && getinfo.thumbnails[getinfo.thumbnails.length-1]?.url) ? getinfo.thumbnails[getinfo.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
      player: `<@${message.author.id}>`
    });
    this.setmsg();
  }

  async getdata(message: M | PM | I, guildDB: guild_type, getsearch?: ytdl.videoInfo, checktime?: boolean): Promise<nowplay | undefined> {
    let data: nowplay | undefined = undefined;
    if (getsearch && getsearch.videoDetails) {
      var getinfo = getsearch.videoDetails;
      data = {
        title: getinfo.title,
        author: getinfo.author!.name,
        duration: getinfo.lengthSeconds,
        player: `<@${message.member?.user.id}>`,
        url: getinfo.video_url,
        image: (getinfo.thumbnails[0].url) ? getinfo.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`
      };
    } else {
      if (checktime) return this.nowplaying ? this.nowplaying : undefined;
      let num = this.queuenumber.shift();
      if (num === undefined || num === null || num === NaN) {
        data = undefined;
      } else {
        data = this.queue[num];
      }
    }
    return data;
  }
  
  async play(message: M | PM | I, getsearch?: ytdl.videoInfo, time?: number) {
    let guildDB = await MDB.get.guild(this.guild);
    if (!guildDB) return this.stop(true, "play-notfoundguildDB");
    const channelid = guildDB.channelId;
    const msgchannel = this.guild.channels.cache.get(channelid) as TextChannel;
    let voicechannel = getchannel(message);
    if (voicechannel) {
      if (getVoiceConnection(this.guild.id)) await entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      let data: nowplay | undefined = await this.getdata(message, guildDB, getsearch, !!time);
      if (this.timeout) clearTimeout(this.timeout);
      if (data) {
        const getq = [ "maxresdefault", "sddefault", "hqdefault", "mqdefault", "default", "0", "1", "2", "3" ];
        data.image = data.image.replace(new RegExp(`${getq.join('\\.|')}\\.`, 'g'), 'hqdefault.').replace(/\?.+/g,"").trim();
        const checkv = await checkvideo({ url: data.url });
        if (checkv[0]) {
          this.nowplaying = data;
        } else {
          msgchannel.send({ embeds: [
            client.mkembed({
              title: `????????????`,
              description: `${checkv[1]}`,
              color: "DARK_RED"
            })
          ] }).then(m => client.msgdelete(m, 1000*10, true));
          this.sendlog(`????????????\n${checkv[1]}\n${data.url}`);
          return this.skipPlayer(message);
        }
        this.nowplaying = data;
      } else {
        return this.waitend();
      }
      this.playing = true;
      this.setmsg();
      const connection = joinVoiceChannel({
        adapterCreator: this.guild.voiceAdapterCreator! as DiscordGatewayAdapterCreator,
        guildId: this.guild.id,
        channelId: voicechannel.id
      });
      const Player = createAudioPlayer();
      let ytsource: internal.Readable | undefined = undefined;
      try {
        ytsource = ytdl(data.url, {
          filter: "audioonly",
          quality: "highestaudio",
          highWaterMark: 1 << 25,
          dlChunkSize: 0,
          begin: time ? time+"s" : undefined,
          requestOptions: { agent }
        }).once('error', (err) => {
          if (client.debug) console.log('ytdl-core??????1:', err);
          return undefined;
        });
      } catch {
        ytsource = undefined;
      }
      if (!ytsource) {
        // connection.destroy();
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `????????????`,
            description: '????????? ????????? ????????????.',
            footer: { text: `not found ytsource` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        this.sendlog(`????????????\n????????? ????????? ????????????.\n${data.url}`);
        return this.skipPlayer(message);
      }
      ytsource.setMaxListeners(0);
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      } catch {
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `????????????`,
            description: '??????????????? ????????????',
            footer: { text: `not set entersState` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        this.sendlog(`????????????\n??????????????? ????????????\n${data.url}`);
        return this.skipPlayer(message);
      }
      const { stream, type } = await demuxProbe(ytsource);
      const resource = createAudioResource(stream, { inlineVolume: true, inputType: type });
      resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 100 : 0.7);
      try {
        Player.setMaxListeners(0).play(resource);
        this.sendlog(`${this.nowplaying.title}\n${this.nowplaying.url}\n?????? ??????`);
        const subscription = connection.subscribe(Player);
        this.players = [ subscription, resource ];
        Player.on(AudioPlayerStatus.Idle, async (P) => {
          // ??? ?????? ?????? ????????????
          Player.stop();
          await entersState(connection, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
          return this.play(message, undefined);
        });
        connection.once('error', (err) => {
          if (client.debug) console.log('connection??????:', err);
          msgchannel.send({ embeds: [
            client.mkembed({
              title: `????????????`,
              description: '????????? ????????? ??? ????????????.\n?????? ??????????????????.',
              footer: { text: `connection error` },
              color: "DARK_RED"
            })
          ] }).then(m => client.msgdelete(m, 3000, true));
          this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n????????? ??????\n(connection error)`);
          return this.skipPlayer(message);
        });
        Player.once('error', (err) => {
          if (client.debug) console.log('Player??????:', err);
          msgchannel.send({ embeds: [
            client.mkembed({
              title: `????????????`,
              description: '????????? ????????? ??? ????????????.\n?????? ??????????????????.',
              footer: { text: `Player error` },
              color: "DARK_RED"
            })
          ] }).then(m => client.msgdelete(m, 3000, true));
          this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n????????? ??????\n(Player error)`);
          return this.skipPlayer(message);
        });
      } catch (err) {
        if (client.debug) console.log('Catch??????:', err);
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `????????????`,
            description: '?????? ????????? ????????????\n?????? ??????????????????.',
            footer: { text: `Catch error` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n????????? ??????\n(Catch error)`);
        return this.skipPlayer(message);
      }
    } else {
      return message instanceof I
        ? undefined
        : message.channel.send({ embeds: [
          client.mkembed({
            title: '??????????????? ????????? ????????????.',
            description: '??????????????? ???????????? ??????????????????.',
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 1));
    }
  }

  pause() {
    if (this.players[0]) {
      if (this.players[0].player.state.status === AudioPlayerStatus.Playing) {
        this.players[0].player.pause();
        if (getVoiceConnection(this.guild.id)) entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
        if (this.notleave) clearInterval(this.notleave);
        this.notleave = setInterval(() => {
          if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) {
            if (this.guild.me?.voice.channelId) entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
          } else {
            if (this.notleave) clearInterval(this.notleave);
          }
        }, 1000*60);
        this.setmsg(true);
      } else {
        this.players[0].player.unpause();
        if (this.notleave) {
          clearInterval(this.notleave);
          this.notleave = undefined;
        }
        this.setmsg();
      }
    }
  }

  autopause() {
    if (this.checkautopause) {
      if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) {
        this.checkautopause = false;
        this.pause();
      }
    } else {
      if (this.players[0]?.player.state.status === AudioPlayerStatus.Playing) {
        this.checkautopause = true;
        this.pause();
      }
    }
  }

  setVolume(number: number) {
    if (this.players[1]) {
      this.players[1].volume?.setVolume(number / 100);
    }
  }
  
  async waitend() {
    if (!this.playing) return;
    await this.stop(false, "waitend");
    this.players[0]?.player.stop();
    this.timeout = setTimeout(() => {
      if (!this.playing && this.queuenumber.length === 0) return this.stop(true, `${BOT_LEAVE_TIME}??????`);
    }, BOT_LEAVE_TIME);
    return;
  }

  async skipPlayer(message: M | PM | I) {
    if (getVoiceConnection(this.guild.id)) {
      await entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      this.play(message, undefined);
    }
  }

  async stop(leave: boolean, text: string) {
    this.playing = false;
    this.queue = [];
    this.queuenumber = [];
    this.nowplaying = null;
    this.inputplaylist = false;
    if (this.notleave) clearTimeout(this.notleave);
    if (this.timeout) clearTimeout(this.timeout);
    this.setmsg();
    if (leave) {
      this.guild.me?.voice?.disconnect();
    } else {
      this.sendlog(`stop ????????? ??????: ${text}`);
    }
  }
  
  stopPlayer() {
    if (this.players[0]) {
      this.players[0].player.stop();
      this.players = [ undefined, undefined ];
    }
  }

  setmsg(pause?: boolean) {
    setTimeout(() => {
      MDB.get.guild(this.guild).then((guildDB) => {
        if (guildDB) {
          let text = this.setlist(guildDB);
          if (!text) return;
          let embed = this.setembed(guildDB, pause);
          if (!embed) return;
          let channel = this.guild.channels.cache.get(guildDB.channelId);
          if (channel && channel.type === "GUILD_TEXT") channel.messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] }).catch((err) => {});
        }
      }).catch((err) => {});
    }, 50);
  }
  setlist(guildDB: guild_type): string | undefined {
    try {
      var output = '__**????????? ??????:**__';
      var list: string[] = [];
      var length = output.length + 20;
      if (this.queuenumber.length > 0) {
        for (let i=0; i<this.queuenumber.length; i++) {
          let data = this.queue[this.queuenumber[i]];
          let text = `\n${i+1}. ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title} [${this.settime(data.duration)}]${(guildDB.options.player) ? ` ~ ${data.player}` : ''}`;
          if (length+text.length > 2000) {
            output += `\n+ ${this.queue.length-list.length}???`;
            break;
          }
          length = length + text.length;
          list.push(text);
        }
        output += list.reverse().join('');
      } else {
        output += `\n?????? ????????? ????????? ??? ???????????? ?????? url??? ????????? ???????????? ???????????????.`;
      }
      return output;
    } catch (err) {
      return undefined;
    }
  }

  setembed(guildDB: guild_type, pause?: boolean): MessageEmbed | undefined {
    try {
      let data: nowplay = this.nowplaying ? this.nowplaying : {
        author: "",
        duration: "",
        image: "",
        player: "",
        title: "",
        url: ""
      };
      var title = '';
      if (this.playing && data.url.length > 0) {
        title = `**[${this.settime(data.duration)}] - ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title}**`;
      } else {
        title = `**?????? ????????? ???????????? ???????????????**.`;
        data.image = 'https://cdn.hydra.bot/hydra_no_music.png';
      }
      let em = client.mkembed({
        title: title,
        image: data.image,
        url: data.url,
        color: client.embedcolor
      });
      if (this.playing && guildDB.options.player) em.setDescription(`?????? ?????????: ${data.player}`);
      if (this.playing) {
        em.setFooter({ text: `?????????: ${this.queuenumber.length}??? | Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | ????????????: ?????????" : ""}${(pause) ? ` | ????????? ???????????? ???????????????.` : ''}` });
      } else {
        em.setFooter({ text: `Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | ????????????: ?????????" : ""}` });
      }
      return em;
    } catch (err) {
      return undefined;
    }
  }
  
  settime(time: string | number): string {
    time = Number(time);
    if (time === 0) return "?????????";
    var list: string[] = [];
    if (time > 3600) {
      list.push(this.az(Math.floor(time/3600)));
      list.push(this.az(Math.floor((time % 3600) / 60)));
      list.push(this.az(Math.floor((time % 3600) % 60)));
    } else {
      list.push(this.az(Math.floor(time / 60)));
      list.push(this.az(Math.floor(time % 60)));
    }
    return list.join(":");
  }

  az(n: number): string {
    return (n < 10) ? '0' + n : '' + n;
  }

  sendlog(text: string) {
    if (!LOGSC) return;
    const guild = client.guilds.cache.get(LOGSC[0]);
    if (!guild) return;
    const channel = guild.channels.cache.get(LOGSC[1]);
    if (!channel) return;
    if (channel.type !== "GUILD_TEXT") return;
    const d = new Date();
    channel.send({ embeds: [ client.mkembed({
      author: {
        name: this.guild.name,
        iconURL: `${this.guild.iconURL({ dynamic: true })}`
      },
      title: `${client.user?.username}`,
      description: `${text}`,
      footer: { text: nowdate() }
    }) ] }).catch((err) => {});
  }
}