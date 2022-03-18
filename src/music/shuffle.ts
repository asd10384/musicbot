import { client } from "../index";
import { PM, M } from "../aliases/discord.js"
import setmsg from "./msg";

export default async function shuffle(message: M | PM) {
  let musicDB = client.musicdb(message.guildId!);
  musicDB.queuenumber = await fshuffle(musicDB.queuenumber);
  client.music.set(message.guildId!, musicDB);
  setmsg(message.guild!);
}

export async function fshuffle(list: any[]) {
  var j, x, i;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random() * i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}