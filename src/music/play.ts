import { client } from "..";
import { PM, M } from "../aliases/discord.js"
import mkembed from "../function/mkembed";
import { nowplay } from "../database/obj/guild";
import ytsr from "ytsr";
import ytdl from "ytdl-core";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnectionStatus } from "@discordjs/voice";
import getchannel from "./getchannel";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import stop from "./stop";
import { TextChannel } from "discord.js";

export default async function play(message: M | PM, getsearch?: ytsr.Video) {
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
    const resource = createAudioResource(ytdl(data.url, { filter: "audioonly", quality: 'highestaudio' }), { inlineVolume: false, inputType: StreamType.Arbitrary });
    // resource.volume?.setVolume((guildDB.options.volume) ? guildDB.options.volume / 10 : 0.7);
    guildDB.playing = true;
    await guildDB.save();
    Player.play(resource);
    const subscription = connection.subscribe(Player);
    setmsg(message);
    // connection.on(VoiceConnectionStatus.Ready, () => {
    //   // 봇 음성채널에 접속
    // });
    subscription?.player.on(AudioPlayerStatus.Idle, () => {
      // 봇 노래 재생 끝났을때
      play(message, undefined);
    });
    subscription?.connection.on(VoiceConnectionStatus.Disconnected, () => {
      // 봇 음성채널에서 퇴장
      stop(message);
    });
    let guildid = guildDB.channelId;
    subscription?.connection.on('error', (err) => {
      if (client.debug) console.log('connection오류:', err);
      (message.guild?.channels.cache.get(guildid) as TextChannel).send({ embeds: [
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
      (message.guild?.channels.cache.get(guildid) as TextChannel).send({ embeds: [
        mkembed({
          title: `오류발생`,
          description: '영상을 재생할수 없습니다.\n다시 시도해주세요.',
          color: 'DARK_RED'
        })
      ] }).then(m => client.msgdelete(m, 3000, true));
      play(message, undefined);
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