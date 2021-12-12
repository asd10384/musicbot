import { client } from "..";
import { M } from "../aliases/discord.js"
import ytsr from "ytsr";
import setmsg from "./msg";

export default async function queue(message: M, getsearch: ytsr.Video) {
  let musicDB = client.musicdb(message.guildId!);
  musicDB.queue.push({
    title: getsearch.title,
    duration: getsearch.duration!,
    author: getsearch.author!.name,
    url: getsearch.url,
    image: (getsearch.thumbnails[0].url) ? getsearch.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
    player: `<@${message.author.id}>`
  });
  client.music.set(message.guildId!, musicDB);
  setmsg(message);
}