import { client } from "../index";
import { ClientUser, Guild, GuildMember, VoiceState } from "discord.js";
import stop from "../music/stop";
import { autopause, checkautopause, stopPlayer } from "../music/play";

export default function voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  if (newState.member!.id === client.user!.id && !newState.channelId) {
    stop(newState.guild, true);
    stopPlayer(newState.guild.id);
  }
  botautopause(oldState.guild);
}

function botautopause(guild: Guild) {
  const user = client.user as ClientUser;
  const member = guild.members.cache.get(user.id) as GuildMember;
  const channel = member.voice.channel;
  if (channel && channel.members.size <= 1) {
    if (!checkautopause.has(guild.id)) autopause(guild);
  } else {
    if (checkautopause.has(guild.id)) autopause(guild);
  }
}