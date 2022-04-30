import "dotenv/config";
import { client } from "../index";
import { Guild, MessageEmbed, TextChannel } from "discord.js";
import { M, PM } from "../aliases/discord.js.js";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, PlayerSubscription, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import ytdl from "ytdl-core";
import ytpl from "ytpl";
import ytsr from "ytsr";
import internal from "stream";
import MDB from "../database/Mongodb";
import { guild_type } from "../database/obj/guild";
import { HttpsProxyAgent } from "https-proxy-agent";
import { fshuffle } from "./shuffle";
import { parmas } from "./music";
import getchannel from "./getchannel";
import checkurl from "./checkurl";

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

  async search(message: M, text: string, parmas?: parmas): Promise<[ytdl.videoInfo | undefined, { type?: Vtype, err?: Etype, addembed?: M }]> {
    if (this.inputplaylist) return [ undefined, { type: "playlist", err: "added" } ];
    let url = checkurl(text);
    if (url.video) {
      let yid = url.video[1].replace(/\&.+/g,'');
      let getinfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${yid}`, {
        lang: "KR",
        requestOptions: { agent }
      }).catch((err) => {
        return undefined;
      });
      if (getinfo && getinfo.videoDetails) {
        if (getinfo.videoDetails.lengthSeconds === "0") return [ undefined, { type: "video", err: "livestream" } ];
        return [ getinfo, { type: "video" } ];
      } else {
        return [ undefined, { type: "video", err: "notfound" } ];
      }
    } else if (url.list) {
      let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
      if (!guildDB) return [ undefined, { type: "database", err: "notfound" } ];
      this.inputplaylist = true;
      const addedembed = await message.channel.send({ embeds: [
        client.mkembed({
          description: `<@${message.author.id}> 플레이리스트 확인중...\n(노래가 많으면 많을수록 오래걸립니다.)`,
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
        if (client.debug) console.log(message.guild?.name, list.title, list.items.length, (guildDB.options.listlimit) ? guildDB.options.listlimit : 300);
        this.sendlog(`${list.title}: ${list.items.length}`);
        const addembed = await message.channel.send({ embeds: [
          client.mkembed({
            title: `\` ${list.title} \` 플레이리스트 추가중...`,
            description: `재생목록에 \` ${list.items.length} \` 곡 ${parmas?.shuffle ? "섞어서 " : ""}추가중`,
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
          this.setmsg(message.guild!);
          this.inputplaylist = false;
          return [ undefined, { type: "playlist", addembed: addembed } ];
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
          let getyt = await ytdl.getInfo(output.shortUrl, {
            lang: "KR",
            requestOptions: { agent }
          });
          this.inputplaylist = false;
          if (getyt && getyt.videoDetails) {
            if (getyt.videoDetails.lengthSeconds === "0") return [ undefined, { type: "video", err: "livestream" } ];
            return [ getyt, { type: "video", addembed: addembed } ];
          } else {
            return [ undefined, { type: "video", err: "notfound" } ];
          }
        }
      } else {
        this.inputplaylist = false;
        return [ undefined, { type: "playlist", err: "notfound" } ];
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
          let getinfo = await ytdl.getInfo(list.items[0].url, {
            lang: "KR"
          });
          this.inputplaylist = false;
          if (getinfo && getinfo.videoDetails) {
            if (getinfo.videoDetails.lengthSeconds === "0") return [ undefined, { type: "video", err: "livestream" } ]
            return [ getinfo, { type: "video" } ];
          } else {
            return [ undefined, { type: "video", err: "notfound" } ];
          }
        }
      }
      this.inputplaylist = false;
      return [ undefined, { type: "video", err: "notfound" } ];
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
    this.setmsg(message.guild!);
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
        data = this.queue[num];
      }
    }
    return data;
  }

  async play(message: M | PM, getsearch?: ytdl.videoInfo) {
    let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (!guildDB) return this.stop(message.guild!, true);
    const channelid = guildDB.channelId;
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
      this.setmsg(message.guild!);
      const connection = joinVoiceChannel({
        adapterCreator: message.guild?.voiceAdapterCreator! as DiscordGatewayAdapterCreator,
        guildId: message.guildId!,
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
      this.sendlog(`${this.nowplaying.title}\n${this.nowplaying.url}\n재생 시작`);
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
        this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(connection error)`);
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
        this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(Player error)`);
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
        this.setmsg(guild, true);
      } else {
        this.players[0].player.unpause();
        if (this.notleave) {
          clearInterval(this.notleave);
          this.notleave = undefined;
        }
        this.setmsg(guild);
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
    if (this.notleave) clearTimeout(this.notleave);
    if (this.timeout) clearTimeout(this.timeout);
    this.setmsg(guild);
    this.sendlog(`stop 명령어 실행`);
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

  setmsg(guild: Guild, pause?: boolean) {
    setTimeout(() => {
      MDB.module.guild.findOne({ id: guild.id }).then((guildDB) => {
        if (guildDB) {
          let text = this.setlist(guildDB);
          let embed = this.setembed(guildDB, pause);
          let channel = guild.channels.cache.get(guildDB.channelId);
          (channel as TextChannel).messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] }).catch((err) => {});
        }
      });
    }, 50);
  }
  setlist(guildDB: guild_type): string {
    var output = '__**대기열 목록:**__';
    var list: string[] = [];
    var length = output.length + 20;
    if (this.queuenumber.length > 0) {
      for (let i=0; i<this.queuenumber.length; i++) {
        let data = this.queue[this.queuenumber[i]];
        let text = `\n${i+1}. ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title} [${this.settime(data.duration)}]${(guildDB.options.player) ? ` ~ ${data.player}` : ''}`;
        if (length+text.length > 2000) {
          output += `\n+ ${this.queue.length-list.length}곡`;
          break;
        }
        length = length + text.length;
        list.push(text);
      }
      output += list.reverse().join('');
    } else {
      output += `\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`;
    }
    return output;
  }

  setembed(guildDB: guild_type, pause?: boolean): MessageEmbed {
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
      title = `**현재 노래가 재생되지 않았습니다**.`;
      data.image = 'https://cdn.hydra.bot/hydra_no_music.png';
    }
    let em = client.mkembed({
      title: title,
      image: data.image,
      url: data.url,
      color: client.embedcolor
    });
    if (this.playing && guildDB.options.player) em.setDescription(`노래 요청자: ${data.player}`);
    if (this.playing) {
      em.setFooter({ text: `대기열: ${this.queuenumber.length}개 | Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | 자동재생: 활성화" : ""}${(pause) ? ` | 노래가 일시중지 되었습니다.` : ''}` });
    } else {
      em.setFooter({ text: `Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | 자동재생: 활성화" : ""}` });
    }
    return em;
  }
  
  settime(time: string | number): string {
    time = Number(time);
    if (time === 0) return "실시간";
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
    channel.send({ embeds: [ client.mkembed({
      author: {
        name: guild.name,
        iconURL: `${guild.iconURL({ dynamic: true })}`
      },
      title: `${client.user?.username}`,
      description: `${text}`,
      timestamp: new Date()
    }) ] }).catch((err) => {});
  }
}