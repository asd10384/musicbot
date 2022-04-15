import { client } from "../index";
import { M } from "../aliases/discord.js.js"
import setmsg from "./msg";
import ytdl from "ytdl-core";

export default async function queue(message: M, getsearch: ytdl.videoInfo) {
  let getinfo = getsearch.videoDetails;
  const mc = client.getmc(message.guild!);
  let list = mc.queue;
  let listnum = mc.queuenumber;
  list.push({
    title: getinfo.title,
    duration: getinfo.lengthSeconds,
    author: getinfo.author!.name,
    url: getinfo.video_url,
    image: (getinfo.thumbnails.length > 0 && getinfo.thumbnails[getinfo.thumbnails.length-1]?.url) ? getinfo.thumbnails[getinfo.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
    player: `<@${message.author.id}>`
  });
  listnum.push(mc.queue.length ? mc.queue.length : 0);
  mc.setqueue(list, listnum);
  setmsg(message.guild!);
}