import { client } from "../index";
import { PM, M } from "../aliases/discord.js.js"
import QDB from "../database/Quickdb";
import { nowplay } from "./musicClass";

export default async function shuffle(message: M | PM) {
  let queue = await QDB.queue(message.guildId!);
  let queuenumber = Array.from({ length: queue.length }, (v, i) => i);
  queuenumber = fshuffle(queuenumber);
  let list: nowplay[] = [];
  for (let i of queuenumber) {
    list.push(queue[i]);
  }
  await QDB.setqueue(message.guildId!, list);
  client.getmc(message.guild!).setmsg();
}

export function fshuffle(list: any[]) {
  var j, x, i;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random() * i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}