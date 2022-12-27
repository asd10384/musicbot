import { client } from "../index";
import { QDB } from "../databases/Quickdb";
import { nowplay } from "./musicClass";
import { Message, PartialMessage } from "discord.js";

export const fshuffle = (list: any[]): any[] => {
  var j, x, i;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random() * i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}

export const shuffle = async (message: Message | PartialMessage) => {
  let queue = await QDB.guild.queue(message.guildId!);
  let queuenumber = Array.from({ length: queue.length }, (_v, i) => i);
  queuenumber = fshuffle(queuenumber);
  let list: nowplay[] = [];
  for (let i of queuenumber) {
    list.push(queue[i]);
  }
  await QDB.guild.setqueue(message.guildId!, list);
  client.getmc(message.guild!).setmsg();
}
