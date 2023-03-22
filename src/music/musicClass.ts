import "dotenv/config";
import { client, MUSICFOLDER } from "../index";
import { Guild, EmbedBuilder, TextChannel, ChannelType, VoiceBasedChannel, GuildMember, Message, PartialMessage, CommandInteraction } from "discord.js";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, PlayerSubscription, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import ytdl from "ytdl-core";
// import ytpl from "ytpl";
import ytsr from "ytsr";
import internal from "stream";
import { Timestamp } from "../utils/Timestamp";
import { QDB, guildData } from "../databases/Quickdb";
import { HttpsProxyAgent } from "https-proxy-agent";
import { fshuffle } from "./shuffle";
import { parmas } from "./music";
import { checkurl } from "./checkurl";
import { checkvideo } from "./checkvideo";
import fluentFFmpeg from "fluent-ffmpeg";
import { createReadStream } from "fs";
import { recommand } from "./recommand";
import { getytmusic } from "./getytmusic";
import { Logger } from "../utils/Logger";
import { makeButton } from "../config/config";
import { getPlayList } from "./getytplaylist";

export const agent = new HttpsProxyAgent(process.env.PROXY!);
export const BOT_LEAVE_TIME = (process.env.BOT_LEAVE ? Number(process.env.BOT_LEAVE) : 10)*60*1000;
const LOG_SERVER_ID = process.env.LOG_SERVER_ID ? process.env.LOG_SERVER_ID.trim() : undefined;
const LOG_SERVER_CHANNEL_ID = process.env.LOG_SERVER_CHANNEL_ID ? process.env.LOG_SERVER_CHANNEL_ID.trim() : undefined;
export const YT_TOKEN = process.env.YT_TOKEN && process.env.YT_TOKEN.length != 0 ? process.env.YT_TOKEN : undefined;

export interface nowplay {
  title: string;
  author: string;
  duration: string;
  url: string;
  image: string;
  player: string;
};

type Vtype = "video" | "playlist" | "database";
// type Etype = "notfound" | "added" | "livestream";

export class Music {
  guild: Guild;
  playing: boolean;
  checkwaitend: boolean;
  nowplaying: nowplay | null;
  nowduration: number;
  nowstatus: string;
  players: [ PlayerSubscription | undefined | null, AudioResource<any> | undefined | null ];
  timeout: NodeJS.Timeout | undefined;
  setVoiceChannel: VoiceBasedChannel | undefined;
  notleave: NodeJS.Timeout | undefined;
  checkautopause: boolean;
  inputplaylist: boolean;
  lastpausetime: number;
  recomlist: string[];
  canrecom: boolean;
  statsChageTime: number;

  constructor(guild: Guild) {
    this.guild = guild;
    this.playing = false;
    this.checkwaitend = false;
    this.nowplaying = null;
    this.nowduration = 0;
    this.nowstatus = "재생되고있지않음";
    this.players = [ undefined, undefined ];
    this.timeout = undefined;
    this.notleave = undefined;
    this.setVoiceChannel = undefined;
    this.checkautopause = false;
    this.inputplaylist = false;
    this.lastpausetime = 0;
    this.recomlist = [];
    this.canrecom = true;
    this.statsChageTime = 0;
  }

  setinputplaylist(getinputplaylist: boolean) {
    this.inputplaylist = getinputplaylist;
  }

  setplaying(getplaying: boolean) {
    this.playing = getplaying;
  }

  setcanrecom(getcanrecom: boolean) {
    this.canrecom = getcanrecom;
  }

  async search(message: Message, text: string, parmas?: parmas): Promise<[ytdl.videoInfo, Vtype, Message | undefined ] | [ undefined, string, Message | undefined ]> {
    if (this.inputplaylist) return [ undefined, `현재 플레이리스트를 추가하는중입니다.\n잠시뒤 사용해주세요.`, undefined ];
    let url = checkurl(text);
    if (url.video) { // 유튜브 영상
      let yid = url.video[1].replace(/\&.+/g,'');
      let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${yid}` });
      if (checkv[0]) return [ checkv[1], "video", undefined ];
      return [ undefined, checkv[1], undefined ];
    } else if (url.list) { // 유튜브 뮤직 통합 재생목록
      let GDB = await QDB.guild.get(this.guild);
      this.inputplaylist = true;
      const embedUrlText = `[플레이리스트](https://music.youtube.com/playlist?list=${url.list[1].replace(/\&.+/g,'')})`;
      const addedembed = await (message.channel as TextChannel).send({ embeds: [
        client.mkembed({
          description: `<@${message.author.id}> ${embedUrlText} 확인중...\n(노래가 많으면 많을수록 오래걸립니다.)`,
          color: client.embedColor
        })
      ] }).catch(() => {
        return undefined;
      });
      let { name, list, err } = await getPlayList(url.list[1].replace(/\&.+/g,''), message.author.id);
      addedembed?.delete().catch(() => {});
      if (err || !list) return [ undefined, `플레이리스트를 찾을수 없습니다.`, undefined ];
      if (client.debug) Logger.log(`${this.guild.name}, ${name}, ${list.length}, ${(GDB.options.listlimit) ? GDB.options.listlimit : 300}`);
      this.sendlog(`${name}: ${list.length}`);
      const addembed = await (message.channel as TextChannel).send({ embeds: [
        client.mkembed({
          title: `\` ${name} \` ${embedUrlText} 추가중...`,
          description: `재생목록에 \` ${list.length} \` 곡 ${parmas?.shuffle ? "섞어서 " : ""}추가중`,
          color: client.embedColor
        })
      ] }).catch(() => {
        return undefined;
      });
      if (parmas?.shuffle) list = fshuffle(list);
      if (this.playing) {
        await QDB.guild.setqueue(this.guild.id, (await QDB.guild.queue(this.guild.id)).concat(list));
        this.setmsg();
        this.inputplaylist = false;
        return [ undefined, `추가됨`, addembed ];
      } else {
        const output = list.shift()!;
        await QDB.guild.setqueue(this.guild.id, (await QDB.guild.queue(this.guild.id)).concat(list));
        let checkv = await checkvideo({ url: output.url });
        this.inputplaylist = false;
        if (checkv[0]) return [ checkv[1], "video", addembed ];
        return [ undefined, checkv[1], addembed ];
      }
    }
    // else if (url.list) { // 유튜브 재생목록
    //   let GDB = await QDB.guild.get(this.guild);
    //   this.inputplaylist = true;
    //   const embedUrlText = `[플레이리스트](https://www.youtube.com/playlist?list=${url.list[1].replace(/\&.+/g,'')})`;
    //   const addedembed = await (message.channel as TextChannel).send({ embeds: [
    //     client.mkembed({
    //       description: `<@${message.author.id}> ${embedUrlText} 확인중...\n(노래가 많으면 많을수록 오래걸립니다.)`,
    //       color: client.embedColor
    //     })
    //   ] }).catch(() => {
    //     return undefined;
    //   });
    //   let list = await ytpl(url.list[1].replace(/\&.+/g,''), {
    //     gl: "KR",
    //     requestOptions: { agent },
    //     limit: 50000 // (GDB.options.listlimit) ? GDB.options.listlimit : 300
    //   }).catch((err) => {
    //     if (client.debug) Logger.error(err);
    //     return undefined;
    //   });
    //   addedembed?.delete().catch(() => {});
    //   if (list && list.items && list.items.length > 0) {
    //     if (client.debug) Logger.log(`${this.guild.name}, ${list.title}, ${list.items.length}, ${(GDB.options.listlimit) ? GDB.options.listlimit : 300}`);
    //     this.sendlog(`${list.title}: ${list.items.length}`);
    //     const addembed = await (message.channel as TextChannel).send({ embeds: [
    //       client.mkembed({
    //         title: `\` ${list.title} \` ${embedUrlText} 추가중...`,
    //         description: `재생목록에 \` ${list.items.length} \` 곡 ${parmas?.shuffle ? "섞어서 " : ""}추가중`,
    //         color: client.embedColor
    //       })
    //     ] }).catch(() => {
    //       return undefined;
    //     });
    //     if (parmas?.shuffle) list.items = fshuffle(list.items);
    //     if (this.playing) {
    //       await QDB.guild.setqueue(this.guild.id, (await QDB.guild.queue(this.guild.id)).concat(list.items.map((data) => {
    //         return {
    //           title: data.title,
    //           duration: data.durationSec!.toString(),
    //           author: data.author.name,
    //           url: data.shortUrl,
    //           image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
    //           player: `<@${message.author.id}>`
    //         }
    //       })));
    //       this.setmsg();
    //       this.inputplaylist = false;
    //       return [ undefined, `추가됨`, addembed ];
    //     } else {
    //       const output = list.items.shift()!;
    //       await QDB.guild.setqueue(this.guild.id, (await QDB.guild.queue(this.guild.id)).concat(list.items.map((data) => {
    //         return {
    //           title: data.title,
    //           duration: data.durationSec!.toString(),
    //           author: data.author.name,
    //           url: data.shortUrl,
    //           image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
    //           player: `<@${message.author.id}>`
    //         }
    //       })));
    //       let checkv = await checkvideo({ url: output.shortUrl });
    //       this.inputplaylist = false;
    //       if (checkv[0]) return [ checkv[1], "video", addembed ];
    //       return [ undefined, checkv[1], addembed ];
    //     }
    //   } else {
    //     this.inputplaylist = false;
    //     return [ undefined, `플레이리스트를 찾을수 없습니다.`, undefined ];
    //   }
    // }
    else { // TEXT 문자
      let getytvid = await getytmusic(text);
      if (getytvid[0]) {
        let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${getytvid[0]}` });
        if (checkv[0]) return [ checkv[1], "video", undefined ];
        return [ undefined, checkv[1], undefined ];
      }
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
      return [ undefined, `검색한 영상을 찾을수 없습니다.`, undefined ];
    }
  }
  async getdata(userId: string, getsearch?: ytdl.videoInfo, checktime?: boolean): Promise<nowplay | undefined> {
    let data: nowplay | undefined = undefined;
    if (getsearch && getsearch.videoDetails) {
      var getinfo = getsearch.videoDetails;
      data = {
        title: getinfo.title,
        author: getinfo.author!.name,
        duration: getinfo.lengthSeconds,
        player: `<@${userId}>`,
        url: getinfo.video_url,
        image: (getinfo.thumbnails[0].url) ? getinfo.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`
      };
    } else {
      if (checktime) return this.nowplaying ? this.nowplaying : undefined;
      let queue = await QDB.guild.queue(this.guild.id);
      let shi = queue.shift();
      if (shi) {
        data = shi;
        await QDB.guild.setqueue(this.guild.id, queue);
      } else if (this.playing && this.canrecom && (await QDB.guild.get(this.guild)).options.recommend) {
        this.setmsg(undefined, true);
        let vid = this.nowplaying ? this.nowplaying.url.replace("https://www.youtube.com/watch?v=","") : "7n9D8ZeOQv0";
        this.recomlist.push(vid);
        let recom = await recommand(this.recomlist, vid);
        // Logger.log(JSON.stringify(recom, undefined, 2));
        if (recom[0]) {
          data = recom[1];
        } else {
          this.recomlist = [];
        }
      }
    }
    return data;
  }

  async getchannel(message: Message | PartialMessage | CommandInteraction | undefined) {
    if (message) {
      const bot = await message.guild?.members.fetchMe({ cache: true });
      if (bot?.voice.channelId) return bot.voice.channel;
      if (message.member && (message.member as GuildMember).voice.channelId) return (message.member as GuildMember).voice.channel;
      return undefined;
    } else {
      const bot = await this.guild.members.fetchMe({ cache: true });
      if (bot?.voice.channelId) return bot.voice.channel;
      return undefined;
    }
  }

  async makefile(msgchannel: TextChannel | undefined, ytsource: internal.Readable, time?: number) {
    return new Promise<string | undefined>((res) => {
      try {
        const fstream = fluentFFmpeg({ source: ytsource }).toFormat('wav');
        if (time) fstream.setStartTime(time);
        fstream.setMaxListeners(0);
        let name = this.guild.id;
        // let name = `${this.guild.id}-${this.setfilename(url)}`;
        fstream.saveToFile(`${MUSICFOLDER}/${name}.wav`);
        fstream.once("end", () => {
          return res(name);
        });
      } catch {
        msgchannel?.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '파일생성중 오류발생',
            footer: { text: `make file error` },
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        return res(undefined);
      }
    });
  }

  async getytsource(msgchannel: TextChannel | undefined, data: nowplay, time: number | undefined, livestream: boolean) {
    return new Promise<[internal.Readable | undefined, string | undefined]>(async (res) => {
      try {
        let ytsource: internal.Readable | undefined = undefined;
        ytsource = ytdl(data.url, {
          filter: livestream ? undefined : "audioonly",
          quality: livestream ? undefined : "highestaudio",
          highWaterMark: 1 << 20,
          dlChunkSize: 0,
          liveBuffer: livestream ? 5000 : undefined,
          requestOptions: {
            agent,
            headers: {
              "cookie": `${YT_TOKEN}`
            }
          }
        }).once('error', (err) => {
          if (client.debug) Logger.error(`ytdl-core오류1: ${err}`);
          return undefined;
        });
        if (!ytsource) {
          msgchannel?.send({ embeds: [
            client.mkembed({
              title: `오류발생`,
              description: '영상을 찾을수 없습니다.',
              footer: { text: `not found ytsource` },
              color: "DarkRed"
            })
          ] }).then(m => client.msgdelete(m, 3000, true));
          this.sendlog(`오류발생\n영상을 찾을수 없습니다.\n(ytsource error)\n${data.url}`);
          return res([ undefined, undefined ]);
        }
        ytsource.setMaxListeners(0);
        if (!time) {
          return res([ ytsource, undefined ]);
        } else {
          const name = await this.makefile(msgchannel, ytsource, time);
          if (!name) {
            msgchannel?.send({ embeds: [
              client.mkembed({
                title: `오류발생`,
                description: '파일생성 오류',
                footer: { text: `makefile error` },
                color: "DarkRed"
              })
            ] }).then(m => client.msgdelete(m, 3000, true));
            this.sendlog(`오류발생\n파일생성 오류\n${data.url}`);
            return res([ undefined, undefined ]);
          }
          const getfile = createReadStream(`${MUSICFOLDER}/${name}.wav`);
          return res([ getfile, name ]);
        }
      } catch {
        msgchannel?.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '영상을 찾을수 없습니다.',
            footer: { text: `ytsource error` },
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        this.sendlog(`오류발생\n영상을 찾을수 없습니다.\n(ytsource Catch error)\n${data.url}`);
        return res([ undefined, undefined ]);
      }
    });
  }

  async setConnection(voicechannel: VoiceBasedChannel) {
    return new Promise<VoiceConnection>((res) => {
      const connection = joinVoiceChannel({
        adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        guildId: this.guild.id,
        channelId: voicechannel.id
      });
      connection.setMaxListeners(0);
      // connection.configureNetworking();
      // connection.on("stateChange", (oldState: VoiceConnectionState, newState: VoiceConnectionState) => {
      //   if (this.statsChageTime <= Date.now()) {
      //     this.statsChageTime = Date.now() + 10000;
      //     connection.configureNetworking();
      //     const oldNetworking = Reflect.get(oldState, 'networking');
      //     const newNetworking = Reflect.get(newState, 'networking');
      //     const networkStateChangeHandler = (_oldNetworkState: any, newNetworkState: any) => {
      //       const newUdp = Reflect.get(newNetworkState, 'udp');
      //       clearInterval(newUdp?.keepAliveInterval);
      //     }
      //     oldNetworking?.off('stateChange', networkStateChangeHandler);
      //     newNetworking?.on('stateChange', networkStateChangeHandler);
      //   }
      // });
      return res(connection);
    });
  }

  async play(message: Message | PartialMessage | CommandInteraction | undefined, getsearch?: ytdl.videoInfo, time?: number) {
    let GDB = await QDB.guild.get(this.guild);
    const channelid = GDB.channelId;
    const msgchannel = this.guild.channels.cache.get(channelid) as TextChannel;
    let voicechannel = await this.getchannel(message);
    let livestream = false;
    this.checkwaitend = false;
    if (voicechannel) {
      if (getVoiceConnection(this.guild.id)) await entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch(() => {});
      let data: nowplay | undefined = await this.getdata(message?.member?.user.id || "", getsearch, !!time);
      this.canrecom = true;
      if (this.timeout) clearTimeout(this.timeout);
      if (data) {
        const getq = [ "maxresdefault", "sddefault", "hqdefault", "mqdefault", "default", "0", "1", "2", "3" ];
        data.image = data.image.replace(new RegExp(`${getq.join('\\.|')}\\.`, 'g'), 'hqdefault.').replace(/\?.+/g,"").trim();
        const checkv = await checkvideo({ url: data.url });
        if (checkv[0]) {
          if (checkv[1].videoDetails.isLiveContent || checkv[1].videoDetails.lengthSeconds === "0") livestream = true;
          this.nowplaying = data;
        } else {
          msgchannel.send({ embeds: [
            client.mkembed({
              title: `오류발생`,
              description: `${checkv[1]}`,
              color: "DarkRed"
            })
          ] }).then(m => client.msgdelete(m, 1000*10, true));
          this.sendlog(`오류발생\n${checkv[1]}\n${data.url}`);
          return this.skipPlayer();
        }
        this.nowplaying = data;
      } else {
        this.checkwaitend = true;
        return this.waitend();
      }
      this.playing = true;

      this.nowstatus = "재생준비중";

      // 노래 정보 가져오기
      const ytsource = await this.getytsource(msgchannel, data, time, livestream);
      if (!ytsource[0]) {
        return this.skipPlayer();
      }
      const resource = createAudioResource(ytsource[0], { inlineVolume: true, inputType: StreamType.Arbitrary });
      resource.volume?.setVolume((GDB.options.volume) ? GDB.options.volume / 100 : 0.7);
      
      const connection = await this.setConnection(voicechannel);
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      } catch {
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '재생시도중 오류발생',
            footer: { text: `not set entersState` },
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        this.sendlog(`오류발생\n재생시도중 오류발생\n${data.url}`);
        return this.skipPlayer();
      }
      this.setmsg();

      try {
        const Player = createAudioPlayer();
        Player.setMaxListeners(0)
        Player.play(resource);
        this.sendlog(`${this.nowplaying.title}\n${this.nowplaying.url}\n재생 시작`);
        const subscription = connection.subscribe(Player);
        this.players = [ subscription, resource ];

        this.nowduration = 0;
        if (time) this.nowduration = time;
        let addduration: NodeJS.Timer | undefined = undefined;
        Player.on(AudioPlayerStatus.Playing, async (_P) => {
          this.canrecom = true;
          this.nowstatus = "재생중";
          if (!livestream) addduration = setInterval(() => {
            this.nowduration++;
          }, 1000);
        });
        Player.on(AudioPlayerStatus.Paused, async (_P) => {
          this.canrecom = true;
          this.nowstatus = "일시정지됨";
          if (addduration) clearInterval(addduration);
        })
        Player.on(AudioPlayerStatus.AutoPaused, async (_P) => {
          this.canrecom = true;
          this.nowstatus = "일시정지됨";
          if (addduration) clearInterval(addduration);
        })
        Player.on(AudioPlayerStatus.Idle, async (_P) => {
          // 봇 노래 재생 끝났을때
          this.canrecom = true;
          this.checkwaitend = true;
          this.nowstatus = "재생중지됨";
          if (addduration) clearInterval(addduration);
          Player.stop();
          await entersState(connection, VoiceConnectionStatus.Ready, 5_000).catch(() => {});
          return this.play(message, undefined, undefined);
        });
        connection.once('error', async (err) => {
          this.nowstatus = "재생중지됨";
          if (addduration) clearInterval(addduration);
          if (connection.state.status != VoiceConnectionStatus.Ready && getVoiceConnection(this.guild.id)) {
            if (client.debug) Logger.error(`connection오류: ${err}`);
            msgchannel.send({ embeds: [
              client.mkembed({
                title: `오류발생`,
                description: '영상을 재생할 수 없습니다.\n다시 시도해주세요.',
                footer: { text: `connection error` },
                color: "DarkRed"
              })
            ] }).then(m => client.msgdelete(m, 3000, true));
            this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(connection error)`);
            return this.skipPlayer();
          } else {
            const check = await checkvideo({ url: data?.url });
            if (check) {
              const info = await ytdl.getInfo(data!.url, {
                lang: "KR",
                requestOptions: {
                  agent,
                  headers: {
                    "cookie": `${YT_TOKEN}`
                  }
                }
              }).catch(() => {
                return undefined;
              });
              return this.play(undefined, info);
            } else {
              msgchannel.send({ embeds: [
                client.mkembed({
                  title: `오류발생`,
                  description: '영상을 재생할 수 없습니다.\n다시 시도해주세요.',
                  footer: { text: `connection checkvideo error` },
                  color: "DarkRed"
                })
              ] }).then(m => client.msgdelete(m, 3000, true));
              this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(connection checkvideo error)`);
              return this.skipPlayer();
            }
          }
        });
        Player.once('error', async (err) => {
          this.nowstatus = "재생중지됨";
          if (addduration) clearInterval(addduration);
          if (Player.state.status != AudioPlayerStatus.Playing) {
            if (client.debug) Logger.error(`Player오류: ${err}`);
            msgchannel.send({ embeds: [
              client.mkembed({
                title: `오류발생`,
                description: '영상을 재생할 수 없습니다.\n다시 시도해주세요.',
                footer: { text: `Player error` },
                color: "DarkRed"
              })
            ] }).then(m => client.msgdelete(m, 3000, true));
            this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(Player error)`);
            return this.skipPlayer();
          } else {
            const check = await checkvideo({ url: data?.url });
            if (check) {
              const info = await ytdl.getInfo(data!.url, {
                lang: "KR",
                requestOptions: {
                  agent,
                  headers: {
                    "cookie": `${YT_TOKEN}`
                  }
                }
              }).catch(() => {
                return undefined;
              });
              return this.play(undefined, info);
            } else {
              msgchannel.send({ embeds: [
                client.mkembed({
                  title: `오류발생`,
                  description: '영상을 재생할 수 없습니다.\n다시 시도해주세요.',
                  footer: { text: `Player checkvideo error` },
                  color: "DarkRed"
                })
              ] }).then(m => client.msgdelete(m, 3000, true));
              this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(connection checkvideo error)`);
              return this.skipPlayer();
            }
          }
        });
      } catch (err) {
        if (client.debug) Logger.error(`Catch오류: ${err}`);
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '영상 재생중 오류발생\n다시 시도해주세요.',
            footer: { text: `Catch error` },
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
        this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(Catch error)`);
        return this.skipPlayer();
      }
    } else {
      if (message) return message instanceof CommandInteraction
        ? undefined
        : (message.channel as TextChannel).send({ embeds: [
          client.mkembed({
            title: '음성채널을 찾을수 없습니다.',
            description: `음성채널에 들어가서 사용해주세요.`,
            footer: { text: `${message.member?.nickname || message.member?.user?.username}님에게 보내는 메세지` },
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 1));
    }
  }

  setVolume(number: number) {
    if (this.players[1]) {
      this.players[1].volume?.setVolume(number / 100);
    }
  }

  np() {
    return new Date(this.nowduration * 1000).toISOString().slice(14, 19);
  }

  playstatus() {
    return this.nowstatus;
  }

  pause() {
    if (this.players[0]) {
      if (this.players[0].player.state.status === AudioPlayerStatus.Playing) {
        this.players[0].player.pause();
        if (getVoiceConnection(this.guild.id)) entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch(() => {});
        if (this.notleave) clearInterval(this.notleave);
        this.guild.members.fetchMe({ cache: true }).then((me) => {
          this.setVoiceChannel = me?.voice.channel || undefined;
        });
        this.lastpausetime = Date.now();
        this.notleave = setInterval(() => {
          if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) {
            this.guild.members.fetchMe({ cache: true }).then((me) => {
              if (me?.voice.channelId) {
                entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch(() => {});
              } else {
                if (this.setVoiceChannel) try {
                  joinVoiceChannel({
                    guildId: this.guild.id,
                    channelId: this.setVoiceChannel.id,
                    adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
                  });
                  entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch(() => {});
                } catch {}
              }
            });
          } else {
            if (this.notleave) clearInterval(this.notleave);
          }
        }, 1000*30);
        this.setmsg(true);
      } else {
        this.players[0].player.unpause();
        this.setVoiceChannel = undefined;
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

  async waitend() {
    if (!this.checkwaitend) return;
    await this.stop(false, "waitend");
    this.players[0]?.player.stop();
    this.timeout = setTimeout(async () => {
      if (!this.playing && (await QDB.guild.queue(this.guild.id)).length === 0) {
        if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) return;
        return this.stop(true, `${BOT_LEAVE_TIME}지남`);
      }
    }, BOT_LEAVE_TIME);
    return;
  }

  async skipPlayer() {
    if (getVoiceConnection(this.guild.id)) {
      await entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch(() => {});
      this.canrecom = true;
      this.play(undefined, undefined, undefined);
    }
  }

  async stop(leave: boolean, text: string) {
    this.playing = false;
    this.checkwaitend = false;
    this.nowplaying = null;
    this.inputplaylist = false;
    this.setVoiceChannel = undefined;
    this.lastpausetime = 0;
    this.recomlist = [];
    this.canrecom = true;
    if (this.notleave) clearInterval(this.notleave);
    if (this.timeout) clearTimeout(this.timeout);
    await QDB.guild.setqueue(this.guild.id, []);
    this.setmsg();
    if (leave) {
      getVoiceConnection(this.guild.id)?.disconnect();
      getVoiceConnection(this.guild.id)?.destroy();
    } else {
      this.sendlog(`stop 명령어 실행: ${text}`);
    }
  }

  stopPlayer() {
    this.canrecom = false;
    this.players[0]?.player.stop();
    this.players = [ undefined, undefined ];
  }

  setmsg(pause?: boolean, waitrecom?: boolean) {
    setTimeout(() => {
      QDB.guild.get(this.guild).then(async (GDB) => {
        const actionRow = makeButton(this.playing && !pause ? false : true, !this.playing, false, !this.playing, (await QDB.guild.queue(this.guild.id)).length <= 1, false);
        let text = await this.setlist(GDB);
        if (!text) return;
        let embed = await this.setembed(GDB, pause, waitrecom);
        if (!embed) return;
        let channel = this.guild.channels.cache.get(GDB.channelId);
        if (channel && channel.type === ChannelType.GuildText) channel.messages.cache.get(GDB.msgId)?.edit({ content: text, embeds: [embed], components: [ actionRow ] }).catch(() => {});
      }).catch(() => {});
    }, 15);
  }
  async setlist(GDB: guildData): Promise<string | undefined> {
    try {
      var output = '__**대기열 목록:**__';
      var list: string[] = [];
      var length = output.length + 20;
      const queue = await QDB.guild.queue(this.guild.id);
      if (queue.length > 0) {
        for (let i in queue) {
          let data = queue[i];
          let text = `\n${Number(i)+1}. ${(GDB.options.author) ? `${data.author.replace(" - Topic","")} - ` : ''}${data.title} [${this.settime(data.duration)}]${(GDB.options.player) ? ` ~ ${data.player}` : ''}`;
          if (length+text.length > 2000) {
            output += `\n+ ${queue.length-list.length}곡`;
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
    } catch (err) {
      return undefined;
    }
  }

  async setembed(GDB: guildData, pause?: boolean, waitrecom?: boolean): Promise<EmbedBuilder | undefined> {
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
        title = `**[${this.settime(data.duration)}] ${(GDB.options.author) ? `${data.author.replace(" - Topic","")} - ` : ''}${data.title}**`;
      } else {
        title = `**현재 노래가 재생되지 않았습니다**.`;
        data.image = 'https://cdn.hydra.bot/hydra_no_music.png';
      }
      let em = client.mkembed({
        title: title,
        image: data.image,
        url: data.url,
        color: client.embedColor
      });
      if (this.playing && GDB.options.player) em.setDescription(`노래 요청자: ${data.player}`);
      if (waitrecom) {
        em.setTitle(`**다음노래 자동선택중...**.`)
          .setDescription(`노래 요청자: 자동재생`)
          .setURL(this.nowplaying?.url || "")
          .setImage(this.nowplaying?.image || "");
      }
      if (this.playing) {
        em.setFooter({ text: `대기열: ${(await QDB.guild.queue(this.guild.id)).length}개 | Volume: ${GDB.options.volume}%${GDB.options.recommend ? " | 자동재생: 활성화" : ""}${(pause) ? ` | 노래가 일시중지 되었습니다.` : ''}` });
      } else {
        em.setFooter({ text: `Volume: ${GDB.options.volume}%${GDB.options.recommend ? " | 자동재생: 활성화" : ""}` });
      }
      return em;
    } catch (err) {
      return undefined;
    }
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

  setfilename(url: string) {
    url = url.replace("https://www.youtube.com/watch?v=","");
    // var r = "000000";
    // var data = `${this.guild.id}-${url}-${r}`;
    // while(true) {
    //   r = Math.floor(Math.random()*1000000).toString().padStart(6,"0");
    //   data = `${this.guild.id}-${url}-${r}`;
    //   if (!MUSICFOLDER_FILES.has(data)) {
    //     MUSICFOLDER_FILES.add(data);
    //     break;
    //   }
    // }
    return `${this.guild.id}-${url}`;
  }

  sendlog(text: string) {
    if (!LOG_SERVER_ID) {
      if (client.debug) Logger.error(`LOG_SERVER_ID를 찾을수 없음`);
      return;
    }
    if (!LOG_SERVER_CHANNEL_ID) {
      if (client.debug) Logger.error(`LOG_SERVER_CHANNEL_ID를 찾을수 없음`);
      return;
    }
    const guild = client.guilds.cache.get(LOG_SERVER_ID);
    if (!guild) return;
    const channel = guild.channels.cache.get(LOG_SERVER_CHANNEL_ID);
    if (!channel) return;
    if (channel.type !== ChannelType.GuildText) return;
    channel.send({ embeds: [ client.mkembed({
      author: {
        name: this.guild.name,
        iconURL: this.guild.iconURL({ forceStatic: true }) || undefined
      },
      title: `${client.user?.username}`,
      description: `${text}`,
      footer: { text: Timestamp() }
    }) ] }).catch(() => {});
  }
}