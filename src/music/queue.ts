import { client } from "..";
import { M } from "../aliases/discord.js"
import setmsg from "./msg";
import ytdl from "ytdl-core";

export default async function queue(message: M, getsearch: ytdl.videoInfo) {
  var getinfo = getsearch.videoDetails;
  let musicDB = client.musicdb(message.guildId!);
  musicDB.queue.push({
    title: getinfo.title,
    duration: getinfo.lengthSeconds,
    author: getinfo.author!.name,
    url: getinfo.video_url,
    image: (getinfo.thumbnails[0].url) ? getinfo.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
    player: `<@${message.author.id}>`
  });
  client.music.set(message.guildId!, musicDB);
  setmsg(message);
}