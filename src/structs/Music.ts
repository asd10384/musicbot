import { BaseGuildVoiceChannel, ChannelType, Guild, VoiceBasedChannel } from "discord.js";
import { BotClass } from "./Bot";
import { AudioPlayerStatus, StreamType, VoiceConnectionStatus, createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { default_channel_name, default_channel_topic, default_msg, default_embed, makeButton } from "../config/music";
import { YoutubeApi } from "../api/YoutubeApi";
import { SpotifyApi } from "../api/SpotifyApi";
import { MDBInputType, MDBType, MusicType, ParmasType } from "../@types/Music";
import { Prisma } from "@prisma/client";
import { fshuffle } from "../utils/shuffle";
import { embedCreate } from "../utils/embedCreate";
import { Logger } from "../utils/Logger";
import { config } from "../config/config";
import { msgDelete } from "../utils/msgDelete";

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
const BOT_LEAVE_TIME = 1000*60*10; // 10분

const YOUTUBE_VIDEO_PATTERN = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
const YOUTUBE_LIST_PATTERN = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
const SPOTIFY_VIDEO_PATTERN = /^(?:https?:\/\/)?(?:open\.)?(?:spotify\.com\/)?(?:track\/)((\w|-).+)(?:\S+)?$/
const SPOTIFY_LIST_PATTERN = /^(?:https?:\/\/)?(?:open\.)?(?:spotify\.com\/)?(?:playlist\/)((\w|-).+)(?:\S+)?$/

export class MusicClass {
  public youtube = new YoutubeApi();
  public spotify = new SpotifyApi(); // 적용 (id 없음)
  public MDB = new Map<string, MDBType>();
  public constructor(private readonly bot: BotClass) {}
  getMDB(guildId: string): MDBType {
    if (!this.MDB.has(guildId)) this.MDB.set(guildId, {
      playing: null,
      queue: [],
      recommandList: [],
      autoPause: false,
      subscription: null,
      channelId: '',
      msgId: '',
      options: {},
      timer: null
    });
    return this.MDB.get(guildId)!;
  }
  setMDB(guildId: string, data: MDBInputType): MDBType {
    const output = {
      ...this.getMDB(guildId),
      ...data
    };
    this.MDB.set(guildId, output);
    return output;
  }
  joinChannel(channel: BaseGuildVoiceChannel): boolean {
    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator
    });
    return true;
  }
  async makeChannel(guild: Guild): Promise<string | null> {
    const channel = await guild.channels.create({
      name: default_channel_name,
      type: ChannelType.GuildText,
      topic: default_channel_topic
    }).catch(() => null);
    if (!channel) return null;
    const msg = await channel?.send({
      content: default_msg,
      embeds: [ default_embed ],
      components: [ makeButton({}) ]
    }).catch(() => null);
    if (!msg) return null;
    const check = await this.bot.db.guild.set(guild.id, {
      guildId: guild.id,
      guildName: guild.name,
      channelId: channel.id,
      msgId: msg.id
    });
    if (!check?.channelId) return null;
    return check.channelId;
  }
  public async stop(guild: Guild) {
    let mdb = this.getMDB(guild.id);
    if (mdb.subscription) mdb.subscription.player.stop(true);
    if (mdb.timer) clearTimeout(mdb.timer);
    this.setMDB(guild.id, {
      playing: null,
      queue: [],
      recommandList: [],
      subscription: null,
      timer: setTimeout(() => {
        const connection = getVoiceConnection(guild.id);
        if (!connection) return;
        connection.disconnect();
        connection.destroy();
      }, BOT_LEAVE_TIME)
    });
    this.setMSG(guild);
  }
  public checkUrl(str: string) {
    return {
      youtube: {
        video: str.match(YOUTUBE_VIDEO_PATTERN),
        list: str.match(YOUTUBE_LIST_PATTERN)
      },
      spotify: {
        video: str.match(SPOTIFY_VIDEO_PATTERN),
        list: str.match(SPOTIFY_LIST_PATTERN),
      }
    };
  }
  public async search(str: string, userId: string): Promise<{ info?: MusicType; videos?: MusicType[]; parmas?: ParmasType; err?: string; }> {
    let parmas: ParmasType = {};
    if (str.includes(" -s") || str.includes(" -S")) {
      parmas.shuffle = true;
      str = str.replace(/ \-s| \-S/,'').trim();
    }
    if (str.includes(" -f") || str.includes(" -F")) {
      parmas.first = true;
      str = str.replace(/ \-f| \-F/,'').trim();
    }
    const check = this.checkUrl(str.replace(/\&.+/g,''));
    if (check.youtube.video) { // 유튜브 영상
      const { info, err } = await this.youtube.getVideo(check.youtube.video[1], userId);
      if (!info || err) return { err: err || "영상을 찾을수 없습니다." };
      return { info: info, parmas: parmas };
    }
    else if (check.youtube.list) { // 유튜브 리스트
      let data = await this.youtube.youtubeMusic.getPlayList(check.youtube.list[1], userId);
      if (!data.videos || data.err) data = await this.youtube.getPlayList(check.youtube.list[1], userId);
      if (!data.videos || data.err) return { err: data.err || "플레이리스트를 찾을수 없습니다." };
      if (parmas.shuffle) for(let i=0; i<3; i++) data.videos = fshuffle(data.videos);
      return { videos: data.videos, parmas: parmas };
    }
    else if (check.spotify.video) { // 스포티파이 노래
      const { info, err } = await this.spotify.getVideo(check.spotify.video[1], userId);
      if (!info || err) return { err: err || "영상을 찾을수 없습니다." };
      return { info: info, parmas: parmas };
    }
    else if (check.spotify.list) { // 스포티파이 리스트
      let { videos, err } = await this.spotify.getPlayList(check.spotify.list[1], userId);
      if (!videos || err) return { err: err || "플레이리스트를 찾을수 없습니다." };
      if (parmas.shuffle) for(let i=0; i<3; i++) videos = fshuffle(videos);
      return { videos: videos, parmas: parmas };
    }
    else { // 텍스트
      let data = await this.youtube.youtubeMusic.getVideoByStr(str, userId);
      if (!data.info || data.err) data = await this.youtube.getVideoByStr(str, userId);
      if (!data.info || data.err) return { err: data.err || "영상을 찾을수 없습니다." };
      return { info: data.info, parmas: parmas };
    }
  }
  public getVoiceChannel(guild: Guild): VoiceBasedChannel | null {
    const channel = guild.members.cache.get(this.bot.client.user!.id)?.voice.channel;
    if (channel) return channel;
    return null;
  }
  public async play(guild: Guild, getInfo?: MusicType, memberChannel?: VoiceBasedChannel, seek?: number) {
    const channel = memberChannel || this.getVoiceChannel(guild);
    if (!channel) return this.errMSG(guild, getInfo?.player || "", "재생오류", "음성채널을 찾을수 없습니다.");
    const { options } = await this.getId(guild);
    
    // 곡선정
    let mdb = this.getMDB(guild.id);
    if (getInfo) {
      mdb = this.setMDB(guild.id, { playing: getInfo });
    } else if (mdb.queue.length > 0) {
      mdb = this.setMDB(guild.id, { playing: mdb.queue[0], queue: mdb.queue.slice(1) });
    } else if (mdb.recommandList.length > 0) {
      mdb = this.setMDB(guild.id, { playing: mdb.recommandList[0], recommandList: mdb.recommandList.slice(1) });
    } else if (options.recommand && mdb.playing?.id) {
      this.setMSG(guild, { lodding: true, sleep: false }, { title: "**노래 자동선택중...**", des: "노래 요청자: 자동재생" });
      const { videos, err } = mdb.playing.type === "spotify"
      ? await this.spotify.getRecommand(mdb.playing.realId)
      : await this.youtube.youtubeMusic.getRecommand(mdb.playing.id);
      if (!videos || err) return this.errMSG(guild, mdb.playing.player, "재생오류", err || "추천 영상을 찾을수 없습니다.");
      mdb = this.setMDB(guild.id, { playing: videos[0], recommandList: videos.slice(1) });
    } else {
      mdb = this.setMDB(guild.id, { playing: null });
    }
    
    if (mdb.playing === null) return this.stop(guild);
    if (mdb.timer) clearTimeout(mdb.timer);

    // 스포티파이라면
    if (mdb.playing.type === "spotify") {
      let data = await this.search(`${mdb.playing.title} ${mdb.playing.author}`, mdb.playing.player);
      if (data.err || !data.info) return this.errMSG(guild, mdb.playing.player, "재생오류", data.err || "영상을 불러오는중 오류가 발생했습니다.");
      mdb.playing.id = data.info.id;
      mdb.playing.duration = data.info.duration;
    }

    this.setMDB(guild.id, {
      playing: {
        ...mdb.playing,
        image: await this.youtube.getThumbnail(mdb.playing.id, mdb.playing.image)
      },
      timer: null
    });

    await this.setMSG(guild, { lodding: true, sleep: false });

    const ytsource = this.youtube.getSource(mdb.playing, seek);
    if (!ytsource) return this.skip(guild);

    const resource = createAudioResource(ytsource, { inlineVolume: true, inputType: StreamType.Arbitrary });
    if (resource.volume) resource.volume.setVolume(0.5);

    const connection = mdb.subscription?.connection || joinVoiceChannel({
      guildId: guild.id,
      channelId: channel.id,
      adapterCreator: guild.voiceAdapterCreator
    });

    if (connection.getMaxListeners() !== 0) connection.setMaxListeners(0);

    if (!mdb.subscription?.connection) await entersState(connection, VoiceConnectionStatus.Ready, 20e3).catch(() => {});
    
    this.setMSG(guild);

    const Player = mdb.subscription?.player || createAudioPlayer();
    if (!mdb.subscription?.player) {
      Player.setMaxListeners(0);

      Player.once("error", (err) => {
        if (config.DEBUG) Logger.error(err);
        if (Player.state.status !== AudioPlayerStatus.Playing) this.skip(guild);
      });
  
      Player.on(AudioPlayerStatus.Idle, () => {
        if (!this.getMDB(guild.id).playing) return;
        Player.stop();
        this.skip(guild);
      });
    }
    Player.play(resource);
    const subscription = connection.subscribe(Player);

    this.setMDB(guild.id, { subscription: subscription });
  }

  public async skip(guild: Guild) {
    let mdb = this.getMDB(guild.id);
    if (!mdb.playing) return;
    if (!mdb.subscription?.connection) return;
    await entersState(mdb.subscription.connection, VoiceConnectionStatus.Ready, 5_000).catch(() => {});
    this.play(guild);
  }

  public pause(guild: Guild, autoPause?: boolean) {
    let mdb = this.getMDB(guild.id);
    if (!mdb.playing) return;
    if (mdb.subscription?.player.state.status === AudioPlayerStatus.Playing) {
      mdb.subscription.player.pause(true);
      if (mdb.timer) clearTimeout(mdb.timer);
      this.setMDB(guild.id, {
        autoPause: autoPause,
        timer: setTimeout(() => {
          if (this.getMDB(guild.id).autoPause) {
            const connection = getVoiceConnection(guild.id);
            if (!connection) return;
            connection.disconnect();
            connection.destroy();
          }
        }, BOT_LEAVE_TIME)
      });
      this.setMSG(guild, { pause: true });
      entersState(mdb.subscription.connection, VoiceConnectionStatus.Ready, 30_000).catch(() => {});
    } else if (mdb.subscription?.player.state.status === AudioPlayerStatus.Paused) {
      mdb.subscription.player.unpause();
      if (mdb.timer) clearTimeout(mdb.timer);
      this.setMDB(guild.id, { autoPause: autoPause, timer: null });
      this.setMSG(guild);
    }
  }

  shuffle(guild: Guild) {
    let mdb = this.getMDB(guild.id);
    if (!mdb.playing) return;
    if (mdb.queue.length === 0) return;
    let list = mdb.queue;
    for (let i=0; i<3; i++) list = fshuffle(list);
    this.setMDB(guild.id, { queue: list });
    this.setMSG(guild);
  }

  public setTime(num: number): string {
    if (num < 60) return "00:"+num.toString().padStart(2, '0');
    return Math.floor(num/60).toString().padStart(2, '0')+':'+(num%60).toString().padStart(2, '0');
  }

  public async setId(guild: Guild, msgId: string): Promise<boolean> {
    const gdb = await this.bot.db.guild.set(guild.id, { msgId: msgId });
    if (!gdb) return false;
    this.setMDB(guild.id, { msgId: msgId });
    return true;
  }
  public async getId(guild: Guild): Promise<{ channelId: string, msgId: string, options: Prisma.JsonObject }> {
    const mdb = this.getMDB(guild.id);
    if (mdb.channelId.length > 0 && mdb.msgId.length > 0) return {
      channelId: mdb.channelId,
      msgId: mdb.msgId,
      options: mdb.options
    };
    const gdb = await this.bot.db.guild.get(guild.id);
    if (!gdb?.channelId) return { channelId: '', msgId: '', options: mdb.options };
    this.setMDB(guild.id, { channelId: gdb.channelId, msgId: gdb.msgId, options: gdb.options as Prisma.JsonObject });
    return { channelId: gdb.channelId, msgId: gdb.msgId, options: gdb.options as Prisma.JsonObject };
  }

  public async errMSG(guild: Guild, userId: string, title: string, des: string) {
    await sleep(50).catch(() => {});
    const { channelId } = await this.getId(guild);
    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    await channel.send({ embeds: [ embedCreate({
      author: {
        name: userId !== "자동재생"
        ? guild.members.cache.get(userId)?.nickname
        || guild.members.cache.get(userId)?.user.username
        || guild.members.cache.get(this.bot.client.user?.id || "")?.nickname
        || guild.members.cache.get(this.bot.client.user?.id || "")?.user.username
        || "이름"
        : "자동재생"
      },
      title: `\` ${title} \``,
      description: des,
      color: "DarkRed"
    }) ] }).then(m => msgDelete(m, 1));
  }

  public async setMSG(guild: Guild, data?: { pause?: boolean; lodding?: boolean; sleep?: boolean; }, custom?: { title: string; des: string; }): Promise<any> {
    if (data?.sleep !== false) await sleep(50).catch(() => {});
    const { channelId, msgId, options } = await this.getId(guild);
    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    let mdb = this.getMDB(guild.id);
    const actionRow = makeButton({
      playing: !!mdb.playing,
      list: mdb.queue.length > 1,
      pause: !!data?.pause
    });
    const listStr = this.getSMGList(mdb);
    const embed = embedCreate({
      title: custom
      ? custom.title
      : data?.lodding
      ? `**노래 불러오는중...**`
      : mdb.playing
      ? `**[${this.setTime(mdb.playing.duration)}] ${mdb.playing.author.replace(" - Topic","")} - ${mdb.playing.title}**`
      : "**현재 노래가 재생되지 않았습니다.**",
      description: custom
      ? custom.des
      : mdb.playing
      ? `노래 요청자: ${mdb.playing.player === "자동재생" ? "자동재생" : `<@${mdb.playing.player}>`}`
      : undefined,
      image: mdb.playing
      ? mdb.playing.image
      : "https://cdn.hydra.bot/hydra_no_music.png",
      url: data?.lodding
      ? undefined
      : mdb.playing
      ? (mdb.playing.type === "spotify" ? "https://open.spotify.com/track/" : "https://youtu.be/") + mdb.playing.id
      : undefined,
      footer: { text: `대기열: ${mdb.queue.length}개${options.recommand ? " | 자동재생: 활성화" : ""}${data?.pause ? ` | 노래가 일시중지 되었습니다.` : ''}` }
    });
    let msg = channel.messages.cache.get(msgId);
    if (msg) return msg.edit({ content: listStr, embeds: [ embed ], components: [ actionRow ] });
    await channel.messages.fetch({ cache: true }).then(async (msgs) => {
      if (msgs.size > 0) return await channel.bulkDelete(msgs.size).catch(() => {});
      return null;
    }).catch(() => {
      return null;
    });
    msg = await channel.send({ content: listStr, embeds: [ embed ], components: [ actionRow ] }).catch(() => undefined);
    const check = await this.setId(guild, msg?.id || '');
    if (!config.DEBUG) return;
    if (!check) Logger.warn(`${guild.name} [${guild.id}] - 메시지 새로고침 실패`);
    Logger.info(`${guild.name} [${guild.id}] - 메시지 새로고침 성공`);
  }
  private getSMGList(mdb: MDBType): string {
    var output = "__**대기열 목록:**__\n";
    var list: string[] = [];
    var length = output.length + 40;
    const queue = mdb.queue;
    if (queue.length > 0) {
      for (let i=0; i<queue.length; i++) {
        let data = queue[i];
        let text = `${(i+1).toString().padStart(queue.length.toString().length, '0')}\\. ${data.author.replace(" - Topic",'')} - ${data.title} [${this.setTime(data.duration)}] ~ ${data.player === "자동재생" ? data.player : `<@${data.player}>`}`
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
  }
}