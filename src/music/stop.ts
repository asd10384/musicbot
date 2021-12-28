import { client } from "..";
import { getVoiceConnection } from "@discordjs/voice";
import { M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";
import setmsg from "./msg";

export default async function stop(message: M | PM, leave: boolean) {
  let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
  if (!guildDB) return;
  let musicDB = client.musicdb(message.guildId!);
  musicDB.playing = false;
  musicDB.queue = [];
  musicDB.nowplaying = {
    author: '',
    duration: '',
    player: '',
    title: '',
    url: '',
    image: ''
  };
  client.music.set(message.guildId!, musicDB);
  setmsg(message);
  if (leave) getVoiceConnection(message.guildId!)?.disconnect();
}