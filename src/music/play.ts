import { client } from "..";
import { PM, M } from "../aliases/discord.js"
import mkembed from "../function/mkembed";
import { nowplay } from "../database/obj/guild";
import ytsr from "ytsr";
import ytdl from "ytdl-core";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import getchannel from "./getchannel";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import stop from "./stop";
import { TextChannel } from "discord.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { config } from "dotenv";
config();

const proxy = process.env.PROXY;
let agent: HttpsProxyAgent | undefined = undefined;
if (proxy) agent = new HttpsProxyAgent(proxy);

const mapPlayer: Map<string, AudioPlayer | undefined | null> = new Map();

export async function play(message: M | PM, getsearch?: ytsr.Video) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return;
  let voicechannel = getchannel(message);
  if (voicechannel) {
    let data: nowplay | undefined = undefined;
    if (getsearch) {
      data = {
        title: getsearch.title,
        author: getsearch.author!.name,
        duration: getsearch.duration!,
        player: `<@${message.author!.id}>`,
        url: getsearch.url,
        image: (getsearch.thumbnails[0].url) ? getsearch.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`
      };
    } else {
      data = guildDB.queue.shift();
    }
    if (data) {
      guildDB.nowplay = data;
    } else {
      return getVoiceConnection(message.guildId!)?.disconnect();
    }
    const connection = joinVoiceChannel({
      adapterCreator: message.guild?.voiceAdapterCreator!,
      guildId: message.guildId!,
      channelId: voicechannel.id
    });
    const Player = createAudioPlayer();
    const ytsource = ytdl(data.url, {
      filter: "audioonly",
      quality: 'highestaudio',
      highWaterMark: 32,
      requestOptions: { agent }
    }).on('error', (err) => {
      if (client.debug) console.log('ytdl-core오류:', err);
      play(message, undefined);
    });
    const { stream, type } = await demuxProbe(ytsource);
    const resource = createAudioResource(stream, { inlineVolume: true, inputType: type });
    resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 100 : 0.7);
    guildDB.playing = true;
    await guildDB.save().catch((err) => { if (client.debug) console.log('데이터베이스오류:', err) });
    const channelid = guildDB.channelId;
    const guildid = message.guildId!;
    Player.play(resource);
    const subscription = connection.subscribe(Player);
    mapPlayer.set(guildid, Player);
    setmsg(message);
    // connection.on(VoiceConnectionStatus.Ready, () => {
    //   // 봇 음성채널에 접속
    // });
    Player.on(AudioPlayerStatus.Idle, (P) => {
      // 봇 노래 재생 끝났을때
      Player.stop();
      play(message, undefined);
    });
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      // 봇 음성채널에서 퇴장
      stop(message);
      stopPlayer(guildid);
    });
    connection.on('error', (err) => {
      if (client.debug) console.log('connection오류:', err);
      (message.guild?.channels.cache.get(channelid) as TextChannel).send({ embeds: [
        mkembed({
          title: `오류발생`,
          description: '영상을 재생할수 없습니다.\n다시 시도해주세요.',
          footer: { text: `connection error` },
          color: 'DARK_RED'
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      stopPlayer(guildid);
    });
    Player.on('error', (err) => {
      if (client.debug) console.log('Player오류:', err);
      (message.guild?.channels.cache.get(channelid) as TextChannel).send({ embeds: [
        mkembed({
          title: `오류발생`,
          description: '영상을 재생할수 없습니다.\n다시 시도해주세요.',
          footer: { text: `Player error` },
          color: 'DARK_RED'
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      stopPlayer(guildid);
    });
  } else {
    return message.channel.send({ embeds: [
      mkembed({
        title: '음성채널을 찾을수 없습니다.',
        description: '음성채널에 들어가서 사용해주세요.',
        color: 'DARK_RED'
      })
    ] }).then(m => client.msgdelete(m, 0.5));
  }
}

export function pause(message: M | PM) {
  const Player = mapPlayer.get(message.guildId!);
  if (Player) {
    if (Player.state.status === AudioPlayerStatus.Playing) {
      Player.pause();
      setmsg(message, true);
    } else {
      Player.unpause();
      setmsg(message);
    }
  }
}

export function stopPlayer(guildId: string) {
  const Player = mapPlayer.get(guildId);
  if (Player) {
    mapPlayer.set(guildId, undefined);
    Player.stop();
  }
}