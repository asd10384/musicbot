import "dotenv/config";
import { client } from "../index";
import { PM, M } from "../aliases/discord.js.js"
import { nowplay } from "../database/obj/guild";
import ytdl from "ytdl-core";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, PlayerSubscription, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import getchannel from "./getchannel";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import stop from "./stop";
import { TextChannel } from "discord.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import internal from "stream";

export const agent = new HttpsProxyAgent(process.env.PROXY!);

const mapPlayer: Map<string, [ PlayerSubscription | undefined | null, AudioResource<any> | undefined | null ]> = new Map();

export async function play(message: M | PM, getsearch?: ytdl.videoInfo) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return stop(message.guild!, true);
  let musicDB = client.musicdb(message.guildId!);
  const channelid = guildDB.channelId;
  const guildid = message.guildId!;
  const msgchannel = message.guild?.channels.cache.get(channelid) as TextChannel;
  let voicechannel = getchannel(message);
  if (voicechannel) {
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
      data = musicDB.queue.shift();
      if (!data && guildDB.options.recommend) data = await getrecommend(message);
    }
    if (data) {
      const getq = [ "maxresdefault", "sddefault", "hqdefault", "mqdefault", "default", "0", "1", "2", "3" ];
      data.image = data.image.replace(new RegExp(`${getq.join('\\.|')}\\.`, 'g'), 'hqdefault.').replace(/\?.+/g,"").trim();
      const checkarea = await getarea(data.url);
      if (checkarea) {
        musicDB.nowplaying = data;
      } else {
        msgchannel.send({ embeds: [
          client.mkembed({
            title: `오류발생`,
            description: '현재 지역에서 영상을 재생할 수 없습니다.',
            footer: { text: `Area error` },
            color: "DARK_RED"
          })
        ] }).then(m => client.msgdelete(m, 3000, true));
      }
      musicDB.nowplaying = data;
    } else {
      return waitend(message);
    }
    musicDB.playing = true;
    client.music.set(message.guildId!, musicDB);
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
      await stopPlayer(message.guildId!);
      msgchannel.send({ embeds: [
        client.mkembed({
          title: `오류발생`,
          description: '영상을 찾을수 없습니다.',
          footer: { text: `not found ytsource` },
          color: "DARK_RED"
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      setTimeout(() => play(message, undefined), 50);
      return;
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
      setTimeout(() => play(message, undefined), 50);
      return;
    }
    const resource = createAudioResource(ytsource, { inlineVolume: true, inputType: StreamType.Arbitrary });
    resource.volume?.setVolumeDecibels(5);
    resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 100 : 0.7);
    Player.play(resource);
    const subscription = connection.subscribe(Player);
    mapPlayer.set(guildid, [ subscription, resource ]);
    // connection.on(VoiceConnectionStatus.Ready, () => {
    //   // 봇 음성채널에 접속
    // });
    Player.on(AudioPlayerStatus.Idle, async (P) => {
      // 봇 노래 재생 끝났을때
      Player.stop();
      await entersState(connection, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      play(message, undefined);
      return;
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
      stopPlayer(guildid);
      return;
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
      stopPlayer(guildid);
      return;
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

export function pause(message: M | PM) {
  const Player = mapPlayer.get(message.guildId!);
  if (Player && Player[0]) {
    if (Player[0].player.state.status === AudioPlayerStatus.Playing) {
      Player[0].player.pause();
      setmsg(message.guild!, true);
    } else {
      Player[0].player.unpause();
      setmsg(message.guild!);
    }
  }
}

export async function skipPlayer(message: M | PM) {
  const Player = mapPlayer.get(message.guildId!);
  if (Player && Player[0] && Player[1]) {
    await entersState(Player[0].connection, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
    play(message, undefined);
  }
}

export async function setVolume(guildId: string, number: number) {
  const Player = mapPlayer.get(guildId);
  if (Player && Player[0] && Player[1]) {
    Player[1].volume?.setVolume(number / 100);
  }
}

export async function waitPlayer(guildId: string) {
  const Player = mapPlayer.get(guildId);
  if (Player && Player[0]) {
    Player[0].player.stop();
  }
}

export async function stopPlayer(guildId: string) {
  const Player = mapPlayer.get(guildId);
  if (Player && Player[0]) {
    mapPlayer.set(guildId, [ undefined, undefined ]);
    Player[0].player.stop();
  }
}

export async function getarea(url: string): Promise<boolean> {
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

export async function waitend(message: M | PM): Promise<void> {
  if (!client.musicdb(message.guildId!).playing) return;
  waitPlayer(message.guildId!);
  stop(message.guild!, false);
  setTimeout(() => {
    if (!client.musicdb(message.guildId!).playing) return stop(message.guild!, true);
  }, (process.env.BOT_LEAVE ? Number(process.env.BOT_LEAVE) : 10)*60*1000);
  return;
}

async function getrecommend(message: M | PM) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return;
  if (guildDB.options.recommend) {
    let musicDB = client.musicdb(message.guildId!);
    if (musicDB && musicDB.nowplaying && musicDB.nowplaying.url.length > 0) {
      const recommend = await ytdl.getInfo(musicDB.nowplaying.url, {
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