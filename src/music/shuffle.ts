import { client } from "..";
import { PM, M } from "../aliases/discord.js"
import MDB from "../database/Mongodb";
import setmsg from "./msg";

export default async function shuffle(message: M | PM) {
  MDB.module.guild.findOne({ id: message.guildId! }).then(async (guildDB) => {
    if (guildDB) {
      guildDB.queue = await fshuffle(guildDB.queue);
      await guildDB.save().catch((err) => { if (client.debug) console.log('데이터베이스오류:', err) });
    }
    setmsg(message);
  });
}

async function fshuffle(list: any[]) {
  var j, x, i;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random() * i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}