import { client } from "../index";
import { VoiceState } from "discord.js";
import stop from "../music/stop";
import { stopPlayer } from "../music/play";

export default function voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  if (newState.member!.id === client.user!.id && !newState.channelId) {
    stop(newState.guild, true);
    stopPlayer(newState.guild.id);
  }
}