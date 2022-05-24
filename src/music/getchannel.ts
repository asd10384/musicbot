import { GuildMember } from "discord.js";
import { I, M, PM } from "../aliases/discord.js.js";

export default function getchannel(message: M | PM | I) {
  if (message.guild?.me?.voice.channelId) return message.guild.me.voice.channel;
  if (message.member && (message.member as GuildMember).voice.channelId) return (message.member as GuildMember).voice.channel;
  return undefined;
}