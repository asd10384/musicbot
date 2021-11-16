import { client } from "..";
import { PM, M } from "../aliases/discord.js"
import mkembed from "../function/mkembed";
import { nowplay } from "../database/obj/guild";
import ytsr from "ytsr";
import ytdl from "ytdl-core";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import getchannel from "./getchannel";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import stop from "./stop";
import { TextChannel } from "discord.js";

const mapPlayer: Map<string, AudioPlayer> = new Map();

export async function play(message: M | PM, getsearch?: ytsr.Video) {
  let guildDB = await MDB.get.guild(message);
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
    const resource = createAudioResource(ytdl(data.url, { filter: "audioonly", quality: 'highestaudio', highWaterMark: 32 }), { inlineVolume: false });
    // resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 10 : 0.7);
    guildDB.playing = true;
    await guildDB.save();
    const channelid = guildDB.channelId;
    const guildid = message.guildId!;
    Player.play(resource);
    const subscription = connection.subscribe(Player);
    setmsg(message);
    connection.on(VoiceConnectionStatus.Ready, () => {
      // 봇 음성채널에 접속
      mapPlayer.set(guildid, Player);
    });
    subscription?.player.on(AudioPlayerStatus.Idle, (P) => {
      // 봇 노래 재생 끝났을때
      if (P.status === AudioPlayerStatus.Playing) return;
      play(message, undefined);
    });
    subscription?.connection.on(VoiceConnectionStatus.Disconnected, () => {
      // 봇 음성채널에서 퇴장
      stop(message);
    });
    subscription?.connection.on('error', (err) => {
      if (client.debug) console.log('connection오류:', err);
      (message.guild?.channels.cache.get(channelid) as TextChannel).send({ embeds: [
        mkembed({
          title: `오류발생`,
          description: '영상을 재생할수 없습니다.\n다시 시도해주세요.',
          color: 'DARK_RED'
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      play(message, undefined);
    });
    subscription?.player.on('error', (err) => {
      if (client.debug) console.log('Player오류:', err);
      (message.guild?.channels.cache.get(channelid) as TextChannel).send({ embeds: [
        mkembed({
          title: `오류발생`,
          description: '영상을 재생할수 없습니다.\n다시 시도해주세요.',
          color: 'DARK_RED'
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      play(message, undefined).catch((err) => {
        console.log('play오류:', err);
        stop(message);
      });
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