import { client } from "../index";
import { ClientUser, Guild, GuildMember, VoiceState } from "discord.js";
import stop from "../music/stop";
import { autopause, checkautopause, mapPlayer, stopPlayer } from "../music/play";
import { AudioPlayerStatus, DiscordGatewayAdapterCreator, joinVoiceChannel } from "@discordjs/voice";

export default function voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  if (newState.member!.id === client.user!.id && !newState.channelId) {
    const Player = mapPlayer.get(oldState.guild.id);
    if (oldState.channelId && Player && Player[0]?.player.state.status === AudioPlayerStatus.Paused) {
      if (checkautopause.has(oldState.guild.id)) {
        joinVoiceChannel({
          guildId: oldState.guild.id,
          channelId: oldState.channelId!,
          adapterCreator: oldState.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
        });
      }
    } else {
      stop(newState.guild, true);
      stopPlayer(newState.guild.id);
    }
  } else {
    botautopause(oldState.guild);
  }
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