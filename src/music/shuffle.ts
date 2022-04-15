import { client } from "../index";
import { PM, M } from "../aliases/discord.js.js"
import setmsg from "./msg";

export default async function shuffle(message: M | PM) {
  const mc = client.getmc(message.guild!);
  mc.setqueuenumber(await fshuffle(mc.queuenumber));
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