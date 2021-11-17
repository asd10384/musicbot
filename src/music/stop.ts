import { client } from "..";
import { getVoiceConnection } from "@discordjs/voice";
import { M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import { stopPlayer } from "./play.js";

export default async function stop(message: M | PM) {
  stopPlayer(message.guildId!);
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
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
  await guildDB.save().catch((err) => { if (client.debug) console.log('데이터베이스오류:', err) });
  setmsg(message);
  getVoiceConnection(message.guildId!)?.disconnect();
}