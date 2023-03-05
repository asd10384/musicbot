import { client } from "../index";
import { ClientUser, Guild, GuildMember, VoiceState } from "discord.js";
import { AudioPlayerStatus, DiscordGatewayAdapterCreator, joinVoiceChannel } from "@discordjs/voice";

export const voiceStateUpdate = (oldState: VoiceState, newState: VoiceState) => {
  if (newState.member!.id === client.user!.id && !newState.channelId) {
    const mc = client.getmc(oldState.guild);
    if (oldState.channelId && mc.players[0]?.player.state.status === AudioPlayerStatus.Paused) {
      if (mc.playing && mc.checkautopause && mc.setVoiceChannel && mc.lastpausetime+(1000*60*58) <= Date.now()) {
        joinVoiceChannel({
          guildId: oldState.guild.id,
          channelId: oldState.channelId!,
          adapterCreator: oldState.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
        });
      } else {
        mc.stopPlayer();
        mc.stop(false, "voiceStateUpdate");
        oldState.guild.members.fetchMe({ cache: true }).then((me) => {
          me?.voice?.disconnect();
        });
      }
    } else {
      mc.stopPlayer();
      mc.stop(false, "voiceStateUpdate");
      oldState.guild.members.fetchMe({ cache: true }).then((me) => {
        me?.voice?.disconnect();
      });
    }
  } else {
    botautopause(oldState.guild);
  }
}

function botautopause(guild: Guild) {
  const user = client.user as ClientUser;
  const member = guild.members.cache.get(user.id) as GuildMember;
  const channel = member.voice.channel;
  const mc = client.getmc(guild);
  if (channel && channel.members.filter((member) => !member.user.bot).size === 0) {
    if (!mc.checkautopause) mc.autopause();
  } else {
    if (mc.checkautopause) mc.autopause();
  }
}