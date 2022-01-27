import { client } from "..";
import { getVoiceConnection } from "@discordjs/voice";
import { M, PM } from "../aliases/discord.js";
import MDB from "../database/Mongodb";
import setmsg from "./msg";
import { Guild } from "discord.js";

export default async function stop(guild: Guild, leave: boolean) {
  let guildDB = await MDB.module.guild.findOne({ id: guild.id });
  if (!guildDB) return;
  let musicDB = client.musicdb(guild.id);
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
  client.music.set(guild.id, musicDB);
  setmsg(guild);
  if (leave) getVoiceConnection(guild.id)?.disconnect();
}