import "dotenv/config";
import { client, MUSICFOLDER } from "../index";
import { Guild, EmbedBuilder, TextChannel, ChannelType, VoiceBasedChannel, GuildMember } from "discord.js";
import { I, M, PM } from "../aliases/discord.js.js";
import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, demuxProbe, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, PlayerSubscription, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import ytdl from "ytdl-core";
import ytpl from "ytpl";
import ytsr from "ytsr";
import internal from "stream";
import nowdate from "../function/nowdate";
import QDB, { guilddata } from "../database/Quickdb";
import { HttpsProxyAgent } from "https-proxy-agent";
import { fshuffle } from "./shuffle";
import { parmas } from "./music";
import checkurl from "./checkurl";
import checkvideo from "./checkvideo";
import fluentFFmpeg from "fluent-ffmpeg";
import { createReadStream, unlink, unlinkSync } from "fs";

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
  nowduration: number;
  nowstatus: string;
  players: [ PlayerSubscription | undefined | null, AudioResource<any> | undefined | null ];
  timeout: NodeJS.Timeout | undefined;
  setVoiceChannel: VoiceBasedChannel | undefined;
  notleave: NodeJS.Timeout | undefined;
  checkautopause: boolean;
  inputplaylist: boolean;
  lastpausetime: number;

  constructor(guild: Guild) {
    this.guild = guild;
    this.playing = false;
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
  }

  setinputplaylist(getinputplaylist: boolean) {
    this.inputplaylist = getinputplaylist;
  }

  async search(message: M, text: string, parmas?: parmas): Promise<[ytdl.videoInfo, Vtype, M | undefined ] | [ undefined, string, M | undefined ]> {
    if (this.inputplaylist) return [ undefined, `현재 플레이리스트를 추가하는중입니다.\n잠시뒤 사용해주세요.`, undefined ];
    let url = checkurl(text);
    if (url.video) { // 유튜브 영상
      let yid = url.video[1].replace(/\&.+/g,'');
      let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${yid}` });
      if (checkv[0]) return [ checkv[1], "video", undefined ];
      return [ undefined, checkv[1], undefined ];
    } else if (url.list) { // 유튜브 재생목록
      let guildDB = await QDB.get(this.guild);
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
        if (client.debug) console.log(this.guild.name, list.title, list.items.length, (guildDB.options.listlimit) ? guildDB.options.listlimit : 300);
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
        if (parmas?.shuffle) list.items = fshuffle(list.items);
        if (this.playing) {
          await QDB.setqueue(this.guild.id, (await QDB.queue(this.guild.id)).concat(list.items.map((data) => {
            return {
              title: data.title,
              duration: data.durationSec!.toString(),
              author: data.author.name,
              url: data.shortUrl,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          })));
          this.setmsg();
          this.inputplaylist = false;
          return [ undefined, `플레이리스트를 찾을수 없습니다.`, addembed ];
        } else {
          const output = list.items.shift()!;
          await QDB.setqueue(this.guild.id, (await QDB.queue(this.guild.id)).concat(list.items.map((data) => {
            return {
              title: data.title,
              duration: data.durationSec!.toString(),
              author: data.author.name,
              url: data.shortUrl,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          })));
          let checkv = await checkvideo({ url: output.shortUrl });
          this.inputplaylist = false;
          if (checkv[0]) return [ checkv[1], "video", addembed ];
          return [ undefined, checkv[1], addembed ];
        }
      } else {
        this.inputplaylist = false;
        return [ undefined, `플레이리스트를 찾을수 없습니다.`, undefined ];
      }
    } else if (url.billboardoo && !text.includes("?")) { // 빌보두 영상
      let yid = url.billboardoo[1];
      let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${yid}` });
      if (checkv[0]) return [ checkv[1], "video", undefined ];
      return [ undefined, checkv[1], undefined ];
    } else if (url.billboardoolist) {  // 빌보두 리스트
      let guildDB = await QDB.get(this.guild);
      this.inputplaylist = true;
      const addedembed = await message.channel.send({ embeds: [
        client.mkembed({
          description: `<@${message.author.id}> 빌보두 플레이리스트 확인중...\n(노래가 많으면 많을수록 오래걸립니다.)`,
          color: client.embedcolor
        })
      ] }).catch((err) => {
        return undefined;
      });
      let getlist: (string|undefined)[] = [ url.billboardoolist[1] || undefined ];
      getlist = getlist.concat(url.billboardoolist.input ? url.billboardoolist.input.replace(url.billboardoolist[0],"").trim().split(",") : [ undefined ]);
      let list: {
        title: string;
        items: ytdl.videoInfo[]
      } = {
        title: "빌보두",
        items: []
      };
      for (let yid of getlist) {
        if (yid) {
          let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${yid}` });
          if (checkv[0]) {
            list.items.push(checkv[1]);
          }
        }
      }
      addedembed?.delete().catch((err) => {});
      if (list && list.items && list.items.length > 0) {
        if (client.debug) console.log(this.guild.name, list.title, list.items.length, (guildDB.options.listlimit) ? guildDB.options.listlimit : 300);
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
          await QDB.setqueue(this.guild.id, (await QDB.queue(this.guild.id)).concat(list.items.map((getdata) => {
            let data = getdata.videoDetails;
            return {
              title: data.title,
              duration: data.lengthSeconds,
              author: data.author.name,
              url: "https://youtu.be/"+data.videoId,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          })));
          this.setmsg();
          this.inputplaylist = false;
          return [ undefined, `플레이리스트를 찾을수 없습니다.`, addembed ];
        } else {
          const output = list.items.shift()!;
          await QDB.setqueue(this.guild.id, (await QDB.queue(this.guild.id)).concat(list.items.map((getdata) => {
            let data = getdata.videoDetails;
            return {
              title: data.title,
              duration: data.lengthSeconds,
              author: data.author.name,
              url: "https://youtu.be/"+data.videoId,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          })));
          let checkv = await checkvideo({ url: output.videoDetails.video_url });
          this.inputplaylist = false;
          if (checkv[0]) return [ checkv[1], "video", addembed ];
          return [ undefined, checkv[1], addembed ];
        }
      } else {
        this.inputplaylist = false;
        return [ undefined, `플레이리스트를 찾을수 없습니다.`, undefined ];
      }
    } else {
      // let filters = await ytsr.getFilters(text, {
      //   gl: 'KO',
      //   requestOptions: { agent }
      // });
      // let searchurl = filters.get("Type")?.get("Video")?.url;
      // if (!searchurl) return [ undefined, "video", undefined ];
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
      let queue = await QDB.queue(this.guild.id);
      let shi = queue.shift();
      await QDB.setqueue(this.guild.id, queue);
      if (shi) data = shi;
    }
    return data;
  }

  async getchannel(message: M | PM | I | undefined) {
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

  async makefile(msgchannel: TextChannel | undefined, ytsource: internal.Readable, url: string, time?: number) {
    return new Promise<string | undefined>((res, rej) => {
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
    return new Promise<[internal.Readable | undefined, string | undefined]>(async (res, rej) => {
      try {
        let ytsource: internal.Readable | undefined = undefined;
        ytsource = ytdl(data.url, {
          filter: livestream ? undefined : "audioonly",
          quality: livestream ? undefined : "highestaudio",
          highWaterMark: 1 << 20,
          dlChunkSize: 0,
          liveBuffer: livestream ? 5000 : undefined,
          requestOptions: { agent }
        }).once('error', (err) => {
          if (client.debug) console.log('ytdl-core오류1:', err);
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
        if (!time) return res([ ytsource, undefined ]);
        else {
          const name = await this.makefile(msgchannel, ytsource, data.url, time);
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

  async setconnection(voicechannel: VoiceBasedChannel) {
    return new Promise<VoiceConnection>((res, rej) => {
      const connection = joinVoiceChannel({
        adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        guildId: this.guild.id,
        channelId: voicechannel.id
      });
      return res(connection);
    })
  }

  async play(message: M | PM | I | undefined, getsearch?: ytdl.videoInfo, time?: number) {
    let guildDB = await QDB.get(this.guild);
    const channelid = guildDB.channelId;
    const msgchannel = this.guild.channels.cache.get(channelid) as TextChannel;
    let voicechannel = await this.getchannel(message);
    let livestream = false;
    if (voicechannel) {
      if (getVoiceConnection(this.guild.id)) await entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      let data: nowplay | undefined = await this.getdata(message?.member?.user.id || "", getsearch, !!time);
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
      resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 100 : 0.7);
      
      const connection = await this.setconnection(voicechannel);
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
        Player.setMaxListeners(0).play(resource);
        this.sendlog(`${this.nowplaying.title}\n${this.nowplaying.url}\n재생 시작`);
        const subscription = connection.subscribe(Player);
        this.players = [ subscription, resource ];

        this.nowduration = 0;
        if (time) this.nowduration = time;
        let addduration: NodeJS.Timer | undefined = undefined;
        Player.on(AudioPlayerStatus.Playing, async (P) => {
          this.nowstatus = "재생중";
          if (!livestream) addduration = setInterval(() => {
            this.nowduration++;
          }, 1000);
        });
        Player.on(AudioPlayerStatus.Paused, async (P) => {
          this.nowstatus = "일시정지됨";
          if (addduration) clearInterval(addduration);
        })
        Player.on(AudioPlayerStatus.AutoPaused, async (P) => {
          this.nowstatus = "일시정지됨";
          if (addduration) clearInterval(addduration);
        })
        Player.on(AudioPlayerStatus.Idle, async (P) => {
          // 봇 노래 재생 끝났을때
          this.nowstatus = "재생중지됨";
          if (addduration) clearInterval(addduration);
          Player.stop();
          await entersState(connection, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
          return this.play(message, undefined);
        });
        connection.once('error', async (err) => {
          this.nowstatus = "재생중지됨";
          if (addduration) clearInterval(addduration);
          if (connection.state.status != VoiceConnectionStatus.Ready && getVoiceConnection(this.guild.id)) {
            if (client.debug) console.log('connection오류:', err);
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
                lang: "KR"
              }).catch((err) => {
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
            if (client.debug) console.log('Player오류:', err);
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
                lang: "KR"
              }).catch((err) => {
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
        if (client.debug) console.log('Catch오류:', err);
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
      if (message) return message instanceof I
        ? undefined
        : message.channel.send({ embeds: [
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
        if (getVoiceConnection(this.guild.id)) entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
        if (this.notleave) clearInterval(this.notleave);
        this.guild.members.fetchMe({ cache: true }).then((me) => {
          this.setVoiceChannel = me?.voice.channel || undefined;
        });
        this.lastpausetime = Date.now();
        this.notleave = setInterval(() => {
          if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) {
            this.guild.members.fetchMe({ cache: true }).then((me) => {
              if (me?.voice.channelId) {
                entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
              } else {
                if (this.setVoiceChannel) try {
                  joinVoiceChannel({
                    guildId: this.guild.id,
                    channelId: this.setVoiceChannel.id,
                    adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
                  });
                  entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 30_000).catch((err) => {});
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
    if (!this.playing) return;
    await this.stop(false, "waitend");
    this.players[0]?.player.stop();
    this.timeout = setTimeout(async () => {
      if (!this.playing && (await QDB.queue(this.guild.id)).length === 0) {
        if (this.players[0]?.player.state.status === AudioPlayerStatus.Paused) return;
        return this.stop(true, `${BOT_LEAVE_TIME}지남`);
      }
    }, BOT_LEAVE_TIME);
    return;
  }

  async skipPlayer() {
    if (getVoiceConnection(this.guild.id)) {
      await entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      this.play(undefined, undefined);
    }
  }

  async stop(leave: boolean, text: string) {
    this.playing = false;
    this.nowplaying = null;
    this.inputplaylist = false;
    this.setVoiceChannel = undefined;
    this.lastpausetime = 0;
    if (this.notleave) clearInterval(this.notleave);
    if (this.timeout) clearTimeout(this.timeout);
    await QDB.setqueue(this.guild.id, []);
    this.setmsg();
    if (leave) {
      this.guild.members.fetchMe({ cache: true }).then((me) => {
        me?.voice?.disconnect();
      });
    } else {
      this.sendlog(`stop 명령어 실행: ${text}`);
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
      QDB.get(this.guild).then(async (guildDB) => {
        if (guildDB) {
          let text = await this.setlist(guildDB);
          if (!text) return;
          let embed = await this.setembed(guildDB, pause);
          if (!embed) return;
          let channel = this.guild.channels.cache.get(guildDB.channelId);
          if (channel && channel.type === ChannelType.GuildText) channel.messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] }).catch(() => {});
        }
      }).catch((err) => {});
    }, 50);
  }
  async setlist(guildDB: guilddata): Promise<string | undefined> {
    try {
      var output = '__**대기열 목록:**__';
      var list: string[] = [];
      var length = output.length + 20;
      const queue = await QDB.queue(this.guild.id);
      if (queue.length > 0) {
        for (let i in queue) {
          let data = queue[i];
          let text = `\n${i+1}. ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title} [${this.settime(data.duration)}]${(guildDB.options.player) ? ` ~ ${data.player}` : ''}`;
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

  async setembed(guildDB: guilddata, pause?: boolean): Promise<EmbedBuilder | undefined> {
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
        em.setFooter({ text: `대기열: ${(await QDB.queue(this.guild.id)).length}개 | Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | 자동재생: 활성화" : ""}${(pause) ? ` | 노래가 일시중지 되었습니다.` : ''}` });
      } else {
        em.setFooter({ text: `Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | 자동재생: 활성화" : ""}` });
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
    if (!LOGSC) return;
    const guild = client.guilds.cache.get(LOGSC[0]);
    if (!guild) return;
    const channel = guild.channels.cache.get(LOGSC[1]);
    if (!channel) return;
    if (channel.type !== ChannelType.GuildText) return;
    channel.send({ embeds: [ client.mkembed({
      author: {
        name: this.guild.name,
        iconURL: this.guild.iconURL({ extension: "png" }) || ""
      },
      title: `${client.user?.username}`,
      description: `${text}`,
      footer: { text: nowdate() }
    }) ] }).catch(() => {});
  }
}