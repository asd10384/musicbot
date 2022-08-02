import { GuildMember } from "discord.js";
import { I, M, PM } from "../aliases/discord.js.js";

export default async function getchannel(message: M | PM | I) {
  const bot = await message.guild?.members.fetchMe({ cache: true });
  if (bot?.voice.channelId) return bot.voice.channel;
  if (message.member && (message.member as GuildMember).voice.channelId) return (message.member as GuildMember).voice.channel;
  return undefined;
}