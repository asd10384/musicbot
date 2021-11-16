import { M } from "../aliases/discord.js"
import MDB from "../database/Mongodb";
import ytsr from "ytsr";
import setmsg from "./msg";

export default async function queue(message: M, getsearch: ytsr.Video) {
  let guildDB = await MDB.get.guild(message);
  if (!guildDB) return;
  guildDB.queue.push({
    title: getsearch.title,
    duration: getsearch.duration!,
    author: getsearch.author!.name,
    url: getsearch.url,
    image: (getsearch.thumbnails[0].url) ? getsearch.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
    player: `<@${message.author.id}>`
  });
  await guildDB.save();
  setmsg(message);
}