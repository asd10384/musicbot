import { getVoiceConnection } from "@discordjs/voice";
import { M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";
import setmsg from "./msg";

export default async function stop(message: M | PM) {
  let guildDB = await MDB.get.guild(message);
  if (!guildDB) return;
  guildDB.playing = false;
  guildDB.queue = [];
  guildDB.nowplay = {
    author: '',
    duration: '',
    player: '',
    title: '',
    url: '',
    image: ''
  };
  await guildDB.save();
  setmsg(message);
  getVoiceConnection(message.guildId!)?.disconnect();
}