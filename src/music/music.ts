import { client } from "../index";
import { ChannelType, Message } from "discord.js";

export interface Parmas {
  suffle?: boolean;
  first?: boolean;
}

export const music = async (message: Message, text: string) => {
  let parmas: Parmas = {};
  if (text.includes(" -s") || text.includes(" -S")) {
    parmas.suffle = true;
    text = text.replace(/ \-s| \-S/,'').trim();
  }
  if (text.includes(" -f") || text.includes(" -F")) {
    parmas.first = true;
    text = text.replace(/ \-f| \-F/,'').trim();
  }
  const channel = message.member!.voice.channel;
  if (!channel) return message.channel.send({ embeds: [ client.mkembed({
    author: { name: message.member!.nickname || message.member!.user.username, iconURL: message.member!.displayAvatarURL({ extension: "png" }) || message.member!.user.defaultAvatarURL },
    description: `음성채널에 들어간 다음 사용해주세요.`,
    color: "DarkRed"
  }) ] }).then(m => client.msgdelete(m, 1));
  const mc = client.getmc(message.guild!);
  const getVoiceChannel = message.guild?.channels.cache.get(mc.voiceChannelId || "");
  if (!getVoiceChannel || ![ ChannelType.GuildVoice, ChannelType.GuildStageVoice ].includes(getVoiceChannel.type)) mc.setVoiceChannelId(channel.id);
  const { err } = await mc.search(message.member!, text, parmas);
  if (err) message.channel.send({ embeds: [ client.mkembed({
    title: `노래 추가 오류`,
    description: err,
    color: "DarkRed"
  }) ] }).then(m => client.msgdelete(m, 1));
  return;
}