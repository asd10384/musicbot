import { client } from "../index";
import { VoiceState } from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";

export const voiceStateUpdate = (oldState: VoiceState, newState: VoiceState) => {
  const mc = client.getmc(oldState.guild);
  if (newState.member!.id === client.user!.id && !newState.channelId) {
    mc.stop({});
  } else if (oldState.channelId && mc.voiceChannelId && oldState.channelId === mc.voiceChannelId && oldState.channel?.members.filter(m => !m.user.bot).size === 0) {
    const mc = client.getmc(oldState.guild);
    mc.setAutoPause(true);
    if (mc.nowSubscription?.player.state.status === AudioPlayerStatus.Playing) mc.nowSubscription.player.pause(true);
    mc.setMsg({ pause: true });
  } else if (newState.channelId && mc.voiceChannelId && newState.channelId === mc.voiceChannelId && newState.channel?.members.filter(m => !m.user.bot).size === 1) {
    mc.setAutoPause(false);
    if (mc.nowSubscription?.player.state.status === AudioPlayerStatus.Paused) mc.nowSubscription.player.unpause();
    mc.setMsg({ pause: false });
  }
}