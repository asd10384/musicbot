import "dotenv/config";
import { client, MUSICFOLDER } from "../index";
import { Guild, EmbedBuilder, TextChannel, ChannelType, GuildMember, Message, GuildBasedChannel } from "discord.js";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, PlayerSubscription, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import ytdl from "ytdl-core";
// import ytpl from "ytpl";
import ytsr from "ytsr";
import internal from "stream";
import fluentFFmpeg from "fluent-ffmpeg";
// import { Timestamp } from "../utils/Timestamp";
import { QDB, guildData } from "../databases/Quickdb";
import { getVideo, agent, YT_TOKEN } from "./getVideo";
import { getPlayList } from "./getPlayList";
import { getMusic } from "./getMusic";
import { getRecommand } from "./getRecommand";
import { Logger } from "../utils/Logger";
import { makeButton } from "../config/config";
import { fshuffle } from "./shuffle";
import { Parmas } from "./music";
import { getThumbnail } from "./getThumbnail";
import { createReadStream } from "fs";
import { getResponse } from "../classes/spotifyResponse";
import { LoadType } from "lavacord";
import { getSpotifyRecommand } from "./getSpotifyRecommand";

export const BOT_LEAVE_TIME = (process.env.BOT_LEAVE ? Number(process.env.BOT_LEAVE) : 10)*60*1000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface nowplay {
  title: string;
  author: string;
  duration: string;
  id: string;
  image: string;
  player: string;
};

export class Music {
  guild: Guild;
  playing: boolean;
  autoPause: boolean;
  queue: nowplay[];
  recomlist: nowplay[];
  nowplaysong: nowplay | undefined;
  nowResource: AudioResource | undefined;
  nowSubscription: PlayerSubscription | undefined;
  voiceChannelId: string | undefined;
  stopTimer: NodeJS.Timeout | undefined;

  constructor(guild: Guild) {
    this.guild = guild;
    this.playing = false;
    this.autoPause = false;
    this.queue = [];
    this.recomlist = [];
    this.nowplaysong = undefined;
    this.nowResource = undefined;
    this.nowSubscription = undefined;
    this.voiceChannelId = undefined;
    this.stopTimer = undefined;
  }

  stop(data: { disconnect?: boolean; dismsg?: boolean; }) {
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.nowSubscription?.player.stop();
    this.playing = false;
    this.autoPause = false;
    this.queue = [];
    this.recomlist = [];
    this.nowplaysong = undefined;
    this.nowSubscription = undefined;
    this.voiceChannelId = undefined;
    this.stopTimer = undefined;
    if (data.disconnect) {
      getVoiceConnection(this.guild.id)?.disconnect();
      getVoiceConnection(this.guild.id)?.destroy();
    } else if (data.disconnect === undefined) {
      this.stopTimer = setTimeout(() => {
        getVoiceConnection(this.guild.id)?.disconnect();
        getVoiceConnection(this.guild.id)?.destroy();
      }, BOT_LEAVE_TIME);
    }
    if (data.dismsg !== false) this.setMsg({});
  }

  setQueue(queue: nowplay[]) {
    this.queue = queue;
  }

  setVoiceChannelId(voiceChannelId: string) {
    this.voiceChannelId = voiceChannelId;
  }

  setAutoPause(autoPause: boolean) {
    this.autoPause = autoPause;
  }

  checkUrl(text: string) {
    const checkVideo = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    const checkList = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
    return {
      video: text.match(checkVideo),
      list: text.match(checkList)
    };
  }

  async search(member: GuildMember, text: string, parmas: Parmas): Promise<{ err?: string }> {
    if (client.spotifyClient && text.match(client.spotifyClient.spotifyPattern)) { // 스포티파이 링크
      const result = await getResponse.load(client.spotifyManager.nodes.get("main")!, text, client.spotifyClient);
      if (result.loadType === LoadType.LOAD_FAILED || result.loadType === LoadType.NO_MATCHES) {
        return { err: "스포티파이 노래를 찾을수없습니다." };
      }
      if (result.loadType === LoadType.TRACK_LOADED) { // 스포티파이 곡
        console.log(result.tracks[0]);
        if (this.playing) {
          if (parmas.first) {
            this.queue.unshift({
              title: result.tracks[0].info.title,
              author: result.tracks[0].info.author,
              duration: (result.tracks[0].info.length/1000).toFixed(0),
              id: "spotify-"+result.tracks[0].info.identifier,
              image: "",
              player: member.id
            });
          } else {
            this.queue.push({
              title: result.tracks[0].info.title,
              author: result.tracks[0].info.author,
              duration: (result.tracks[0].info.length/1000).toFixed(0),
              id: "spotify-"+result.tracks[0].info.identifier,
              image: "",
              player: member.id
            });
          }
          this.setMsg({});
        } else {
          this.play({ playData: {
            title: result.tracks[0].info.title,
            author: result.tracks[0].info.author,
            duration: (result.tracks[0].info.length/1000).toFixed(0),
            id: "spotify-"+result.tracks[0].info.identifier,
            image: "",
            player: member.id
          } });
        }
        return {};
      }
      if (result.loadType === LoadType.PLAYLIST_LOADED) { // 스포티파이 플레이리스트
        let list = result.tracks.map((v) => {
          return {
            title: v.info.title,
            author: v.info.author,
            duration: (v.info.length/1000).toFixed(0),
            id: "spotify-"+v.info.identifier,
            image: "",
            player: member.id
          };
        })
        if (parmas.suffle) list = fshuffle(list);
        if (this.playing) {
          if (parmas.first) {
            this.queue = list.concat(this.queue);
          } else {
            this.queue = this.queue.concat(list);
          }
          this.setMsg({});
        } else {
          const first = list[0];
          this.play({ playData: first });
          this.queue = this.queue.concat(list.slice(1));
        }
        return {};
      }
    }
    const { video: checkVideo, list: checkList } = this.checkUrl(text);
    if (checkVideo !== null) { // 유튜브 | 유튜브 뮤직 곡
      const { videoData, err } = await getVideo({ id: checkVideo[1].replace(/\&.+/g,"").trim() });
      if (!videoData || err) return { err: err };
      if (this.playing) {
        if (parmas.first) {
          this.queue.unshift({
            ...videoData,
            player: member.id
          });
        } else {
          this.queue.push({
            ...videoData,
            player: member.id
          });
        }
        this.setMsg({});
      } else {
        this.play({ playData: {
          ...videoData,
          player: member.id
        } });
      }
    } else if (checkList !== null) { // 유튜브 | 유튜브 뮤직 플레이리스트
      let { list, err } = await getPlayList(checkList[1].replace(/\&.+/g,"").trim(), member.id);
      if (!list || err) return { err: err || "플레이리스트에 영상이 없음" };
      if (parmas.suffle) list = fshuffle(list);
      if (this.playing) {
        if (parmas.first) {
          this.queue = list.concat(this.queue);
        } else {
          this.queue = this.queue.concat(list);
        }
        this.setMsg({});
      } else {
        const first = list[0];
        this.play({ playData: first });
        this.queue = this.queue.concat(list.slice(1));
      }
    } else { // 텍스트
      let id: string | undefined = undefined;
      let { id: getMusicId, err } = await getMusic(text);
      if (getMusicId) {
        id = getMusicId;
      } else {
        id = await ytsr(text, {
          gl: 'KO',
          requestOptions: { agent },
          limit: 1
        }).then((list) => {
          if (list && list.items && list.items.length > 0) {
            list.items = list.items.filter((item) => item.type === "video");
            if (list.items.length > 0 && list.items[0].type === "video") return list.items[0].id;
          }
          return undefined;
        }).catch(() => {
          return undefined;
        });
      }
      if (!id) return { err: err || "노래를 찾을수 없습니다." };
      const { videoData, err: err2 } = await getVideo({ id: id });
      if (!videoData || err2) return { err: err2 };
      if (this.playing) {
        if (parmas.first) {
          this.queue.unshift({
            ...videoData,
            player: member.id
          });
        } else {
          this.queue.push({
            ...videoData,
            player: member.id
          });
        }
        this.setMsg({});
      } else {
        this.play({ playData: {
          ...videoData,
          player: member.id
        } })
      }
    }
    return {};
  }

  getVoiceChannel(): GuildBasedChannel | undefined {
    const channel = this.guild.channels.cache.get(this.voiceChannelId || "");
    if (channel && [ ChannelType.GuildVoice, ChannelType.GuildStageVoice ].includes(channel.type)) return channel;
    return undefined;
  }

  async play(data: { playData?: nowplay, startTime?: number; }) {
    const channel = this.getVoiceChannel();
    if (!channel) return this.errMsg("음성채널을 찾을수 없습니다.");
    this.playing = true;
    const gdb = await QDB.guild.get(this.guild);

    // 곡선정
    if (data.playData) {
      this.nowplaysong = data.playData;
    } else if (this.queue.length > 0) {
      this.nowplaysong = this.queue[0];
      this.queue = this.queue.slice(1);
    } else if (this.recomlist.length > 0) {
      this.nowplaysong = this.recomlist[0];
      this.recomlist = this.recomlist.slice(1);
    } else if (gdb.options.recommend && this.nowplaysong?.id) {
      this.setMsg({ waitrecom: true });
      const { videoList, err } = this.nowplaysong.id.startsWith("spotify-") ? await getSpotifyRecommand(client.spotifyClient, this.nowplaysong.id.replace(/\#.+/g,"") || "spotify-WdiSosDz4ss") : await getRecommand(this.nowplaysong.id || "WdiSosDz4ss");
      if (!videoList || err) {
        this.errMsg(err || "추천노래를 찾을수 없습니다.");
        return;
      }
      this.nowplaysong = videoList[0];
      this.recomlist = videoList.slice(1);
    } else {
      this.nowplaysong = undefined;
    }

    if (this.nowplaysong?.id.startsWith("spotify-")) { // 스포티파이 곡 -> 유튜브 뮤직 곡 변경
      let spotify_player = this.nowplaysong.player;
      let id: string | undefined = undefined;
      let spotify_text = `${this.nowplaysong.author} - ${this.nowplaysong.title}`;
      let { id: getMusicId } = await getMusic(`${this.nowplaysong.author} - ${this.nowplaysong.title}`);
      if (getMusicId) {
        id = id + "#" + getMusicId;
      } else {
        id = await ytsr(spotify_text, {
          gl: 'KO',
          requestOptions: { agent },
          limit: 1
        }).then((list) => {
          if (list && list.items && list.items.length > 0) {
            list.items = list.items.filter((item) => item.type === "video");
            if (list.items.length > 0 && list.items[0].type === "video") return list.items[0].id;
          }
          return undefined;
        }).catch(() => {
          return undefined;
        });
      }
      if (!id) {
        this.nowplaysong = undefined;
      } else {
        const { videoData, err: err2 } = await getVideo({ id: id.replace(/.+\#/g,"") });
        if (!videoData || err2) {
          this.nowplaysong = undefined;
        } else {
          this.nowplaysong = {
            ...videoData,
            id: id.includes("#") ? id : this.nowplaysong.id + "#" + videoData.id,
            player: spotify_player
          };
        }
      }
    }

    // 곡선정 끝
    if (!this.nowplaysong) return this.stop({});

    this.nowplaysong.image = await getThumbnail(this.nowplaysong.id, this.nowplaysong.image);

    if (this.stopTimer) clearTimeout(this.stopTimer);
    
    // ytsource
    let ytsource: internal.Readable | undefined = undefined;
    try {
      ytsource = ytdl(this.nowplaysong.id.replace(/.+\#/g,""), {
        filter: this.nowplaysong.duration === "0" ? undefined : "audioonly",
        quality: this.nowplaysong.duration === "0" ? undefined : "highestaudio",
        highWaterMark: 1 << 25,
        dlChunkSize: 0,
        liveBuffer: this.nowplaysong.duration === "0" ? 5000 : undefined,
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
        ytsource = ytdl(this.nowplaysong.id.replace(/.+\#/g,""), {
          filter: this.nowplaysong.duration === "0" ? undefined : "audioonly",
          quality: this.nowplaysong.duration === "0" ? undefined : "highestaudio",
          highWaterMark: 1 << 20,
          dlChunkSize: 0,
          liveBuffer: this.nowplaysong.duration === "0" ? 5000 : undefined,
          requestOptions: {
            agent,
            headers: {
              "cookie": `${YT_TOKEN}`
            }
          }
        }).once('error', (err) => {
          if (client.debug) Logger.error(`ytdl-core오류2: ${err}`);
          return undefined;
        });
      }
    } catch {}
    if (!ytsource) {
      this.errMsg("영상을 찾을수 없습니다. (ytsource2)");
      this.skipPlayer();
      return;
    }
    if (data.startTime) {
      let ytsource2 = await this.makeFileWithStartTime(ytsource, data.startTime);
      if (ytsource2) ytsource = ytsource2;
    }
    ytsource.setMaxListeners(0);
    // ytsource 끝
    
    const resource = createAudioResource(ytsource, { inlineVolume: true, inputType: StreamType.Arbitrary });
    resource.volume?.setVolume(gdb.options.volume ? gdb.options.volume / 100 : 0.7);

    const connection = joinVoiceChannel({
      guildId: this.guild.id,
      channelId: channel.id,
      adapterCreator: this.guild.voiceAdapterCreator
    });
    connection.setMaxListeners(0);
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch(() => {
        this.errMsg("재생시도중 오류발생 (1)");
        this.skipPlayer();
      });
    } catch {
      this.errMsg("재생시도중 오류발생 (2)");
      this.skipPlayer();
      return;
    }
    
    this.setMsg({});

    try {
      const Player = createAudioPlayer();
      Player.setMaxListeners(0)
      Player.play(resource);
      // this.sendlog(`${this.nowplaying.title}\n${this.nowplaying.url}\n재생 시작`);
      const subscription = connection.subscribe(Player);
      this.nowResource = resource;
      this.nowSubscription = subscription;
      // this.players = [ subscription, resource ];

      // connection.once('error', async (err) => {
      //   if (connection.state.status != VoiceConnectionStatus.Ready && getVoiceConnection(this.guild.id)) {
      //     if (client.debug) Logger.error(`connection오류: ${err}`);
      //     // this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(connection error)`);
      //     this.errMsg("재생중 오류발생 (connection)");
      //     this.skipPlayer();
      //     return;
      //   }
      // });
      Player.once('error', async (err) => {
        if (Player.state.status != AudioPlayerStatus.Playing) {
          if (client.debug) Logger.error(`Player오류: ${err}`);
          // this.sendlog(`${this.nowplaying?.title}\n${this.nowplaying?.url}\n재생중 오류\n(Player error)`);
          this.errMsg("재생중 오류발생 (Player)");
          this.skipPlayer();
          return;
        }
      });

      Player.on(AudioPlayerStatus.Idle, async (_P) => {
        // 봇 노래 재생 끝났을때
        if (!this.playing) return;
        Player.stop();
        try {
          await entersState(connection, VoiceConnectionStatus.Ready, 5_000).catch(() => {});
        } catch {}
        return this.play({});
      });
    } catch {
      this.errMsg("재생중 오류발생 (catch)");
      this.skipPlayer();
    }
  }

  async makeFileWithStartTime(ytsource: internal.Readable, startTime: number) {
    return new Promise<internal.Readable | undefined>(async (res) => {
      try {
        const fstream = fluentFFmpeg({ source: ytsource }).toFormat("mp3").setStartTime(startTime);
        const fstreamPath = `${MUSICFOLDER}/${this.guild.id}.mp3`;
        
        fstream.saveToFile(fstreamPath);
        fstream.once("end", () => {
          let get = createReadStream(fstreamPath);
          return res(get);
        });
      } catch {
        return res(undefined);
      }
    });
  }
  
  async skipPlayer() {
    if (!this.playing) return;
    if (getVoiceConnection(this.guild.id)) {
      await entersState(getVoiceConnection(this.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch(() => {});
      this.play({});
    }
  }

  pause() {
    if (!this.playing) return;
    if (this.nowSubscription?.player.state.status === AudioPlayerStatus.Playing) {
      this.nowSubscription.player.pause(true);
      this.setMsg({ pause: true });
      entersState(this.nowSubscription.connection, VoiceConnectionStatus.Ready, 30_000).catch(() => {});
    } else if (!this.autoPause) {
      this.nowSubscription?.player.unpause();
      this.setMsg({ pause: false });
    }
  }

  shuffle() {
    if (!this.playing) return;
    let queuenumber = Array.from({ length: this.queue.length }, (_v, i) => i);
    queuenumber = fshuffle(queuenumber);
    let list: nowplay[] = [];
    for (let i of queuenumber) {
      list.push(this.queue[i]);
    }
    this.queue = list;
    this.setMsg({});
  }

  async setMsg(data: { pause?: boolean; waitrecom?: boolean; }) {
    await sleep(50).catch(() => {});
    const gdb = await QDB.guild.get(this.guild);
    const actionRow = makeButton(this.playing && (!this.autoPause || !!!data.pause), !this.playing, false, !this.playing, this.queue.length <= 1, false);
    let text = await this.setList(gdb);
    if (!text) return;
    let embed = await this.setEmbed(gdb, this.autoPause || !!data.pause, !!data.waitrecom);
    if (!embed) return;
    const channel = this.guild.channels.cache.get(gdb.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    let msg: Message | undefined = channel.messages.cache.get(gdb.msgId);
    if (msg) {
      msg.edit({ content: text, embeds: [ embed ], components: [ actionRow ] }).catch(() => {});
    } else {
      let msgs = await channel.messages.fetch().catch(() => {
        return undefined;
      });
      if (!msgs) return;
      try {
        if (msgs.size > 0) (channel as TextChannel).bulkDelete(msgs.size).catch(() => {
          if (client.debug) Logger.error('메세지 전체 삭제 오류');
        });
      } catch (err) {}
      await sleep(500).catch(() => {});;
      msg = await (channel as TextChannel).send({ content: "메세지 오류 수정중입니다..." });
      await QDB.guild.set(this.guild, {
        msgId: msg?.id ? msg.id : "null"
      }).then((check) => {
        if (!check || !embed) return;
        msg?.edit({ content: text, embeds: [ embed ], components: [ actionRow ] }).catch(() => {});
        if (!msg?.guild) return;
        Logger.ready(`${msg.guild.name} : 오류 fix 성공`);
        // this.sendlog(`오류 fix 성공`);
      }).catch(() => {});
    }
  }
  async setList(gdb: guildData): Promise<string | undefined> {
    try {
      var output = '__**대기열 목록:**__\n';
      var list: string[] = [];
      var length = output.length + 40;
      // const queue = await QDB.guild.queue(this.guild.id);
      const queue = this.queue;
      if (queue.length > 0) {
        for (let i=0; i<queue.length; i++) {
          let data = queue[i];
          let text = `${(i+1).toString().padStart(queue.length.toString().length, '0')}\\. ${(gdb.options.author) ? `${data.author.replace(" - Topic","")} - ` : ''}${data.title} [${this.setTime(data.duration)}]${(gdb.options.player) ? ` ~ ${data.player === "자동재생" ? data.player : `<@${data.player}>`}` : ''}`;
          if (length + text.length > 2000) {
            output += `+ ${queue.length-list.length}곡\n`;
            break;
          }
          length += text.length;
          list.push(text);
        }
        output += list.reverse().join('\n');
      } else {
        output += `음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`;
      }
      return output;
    } catch {
      return undefined;
    }
  }
  
  async setEmbed(gdb: guildData, pause?: boolean, waitrecom?: boolean): Promise<EmbedBuilder | undefined> {
    try {
      let data: nowplay = this.nowplaysong || {
        author: "",
        duration: "",
        image: "",
        player: "",
        title: "",
        id: ""
      };
      var title = '';
      if (this.playing && data.id.length > 0) {
        title = `**[${this.setTime(data.duration)}] ${(gdb.options.author) ? `${data.author.replace(" - Topic","")} - ` : ''}${data.title}**`;
      } else {
        title = `**현재 노래가 재생되지 않았습니다**.`;
        data.image = 'https://cdn.hydra.bot/hydra_no_music.png';
      }
      let em = client.mkembed({
        title: title,
        image: data.image,
        url: data.id ? "https://youtu.be/" + data.id : undefined
      });
      if (this.playing && gdb.options.player) em.setDescription(`노래 요청자: ${data.player === "자동재생" ? data.player : `<@${data.player}>`}`);
      if (waitrecom) {
        em.setTitle(`**다음노래 자동선택중...**.`)
          .setDescription(`노래 요청자: 자동재생`)
          .setURL("https://music.youtube.com")
          .setImage(data.image);
      }
      if (this.playing) {
        em.setFooter({ text: `대기열: ${this.queue.length}개 | 볼륨: ${gdb.options.volume}%${gdb.options.recommend ? " | 자동재생: 활성화" : ""}${(pause) ? ` | 노래가 일시중지 되었습니다.` : ''}` });
      } else {
        em.setFooter({ text: `볼륨: ${gdb.options.volume}%${gdb.options.recommend ? " | 자동재생: 활성화" : ""}` });
      }
      return em;
    } catch (err) {
      return undefined;
    }
  }

  az(n: number): string {
    return (n < 10) ? '0' + n : '' + n;
  }
  setTime(time: string | number): string {
    time = Number(time);
    if (time < 0) return "00:00";
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

  async errMsg(err: string) {
    const gdb = await QDB.guild.get(this.guild);
    if (!gdb.channelId) return;
    const channel = this.guild.channels.cache.get(gdb.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    channel.send({ embeds: [ client.mkembed({
      title: `오류`,
      description: err,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 1));
  }
}