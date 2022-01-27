import { client } from "..";
import ytsr from "ytsr";
import ytpl from "ytpl";
import MDB from "../database/Mongodb";
import { nowplay } from "../database/obj/guild";
import { M } from "../aliases/discord.js";
import setmsg from "./msg";
import ytdl from "ytdl-core";
import { fshuffle } from "./shuffle";
import { agent } from "./play";

type Vtype = "video" | "playlist" | "database";
type Etype = "notfound" | "added" | "livestream";
interface parmas {
  shuffle?: boolean;
};

export const inputplaylist = new Set<string>();

export default async function search(message: M, text: string, parmas?: parmas): Promise<[ytdl.videoInfo | undefined, { type?: Vtype, err?: Etype, addembed?: M }]> {
  if (inputplaylist.has(message.guildId!)) return [ undefined, { type: "playlist", err: "added" } ];
  let url = checkurl(text);
  if (url.video) {
    let yid = url.video[1].replace(/\&.+/g,'');
    let getinfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${yid}`, {
      lang: "KR",
      requestOptions: { agent }
    }).catch((err) => {
      return undefined;
    });
    if (getinfo) {
      if (getinfo.videoDetails.lengthSeconds === "0") return [ undefined, { type: "video", err: "livestream" } ]
      return [ getinfo, { type: "video" } ];
    } else {
      return [ undefined, { type: "video", err: "notfound" } ];
    }
  } else if (url.list) {
    let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (!guildDB) return [ undefined, { type: "database", err: "notfound" } ];
    
    inputplaylist.add(message.guildId!);
    
    let musicDB = client.musicdb(message.guildId!);

    const addedembed = await message.channel.send({ embeds: [
      client.mkembed({
        description: `<@${message.author.id}> 플레이리스트 확인중...\n(노래가 많으면 많을수록 오래걸립니다.)`,
        color: client.embedcolor
      })
    ] });

    let yid = url.list[1].replace(/\&.+/g,'');
    let list = await ytpl(yid, {
      gl: "KR",
      requestOptions: { agent },
      limit: 50000 // (guildDB.options.listlimit) ? guildDB.options.listlimit : 300
    }).catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
    addedembed.delete();
    if (list && list.items && list.items.length > 0) {
      if (client.debug) console.log(message.guild?.name, list.title, list.items.length, (guildDB.options.listlimit) ? guildDB.options.listlimit : 300);
      const addembed = await message.channel.send({ embeds: [
        client.mkembed({
          title: `\` ${list.title} \` 플레이리스트 추가중...`,
          description: `재생목록에 \` ${list.items.length} \` 곡 ${parmas?.shuffle ? "섞어서 " : ""}추가중`,
          color: client.embedcolor
        })
      ] });
        if (parmas?.shuffle) list.items = await fshuffle(list.items);
      if (musicDB.playing) {
        let queuelist: nowplay[] = [];
        list.items.forEach((data) => {
          queuelist.push({
            title: data.title,
            duration: data.durationSec!.toString(),
            author: data.author.name,
            url: data.shortUrl,
            image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
            player: `<@${message.author.id}>`
          });
        });
        musicDB.queue = musicDB.queue.concat(queuelist);
        client.music.set(message.guildId!, musicDB);
        setmsg(message.guild!);
        inputplaylist.delete(message.guildId!);
        return [ undefined, { type: "playlist", addembed: addembed } ];
      } else {
        let output = list.items.shift();
        let queuelist: nowplay[] = [];
        list.items.forEach((data) => {
          queuelist.push({
            title: data.title,
            duration: data.durationSec!.toString(),
            author: data.author.name,
            url: data.shortUrl,
            image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
            player: `<@${message.author.id}>`
          });
        });
        musicDB.queue = musicDB.queue.concat(queuelist);
        client.music.set(message.guildId!, musicDB);
        if (!output) {
          inputplaylist.delete(message.guildId!);
          return [ undefined, { type: "video", err: "notfound", addembed: addembed } ];
        }
        let getyt = await ytdl.getInfo(output.shortUrl, {
          lang: "KR",
          requestOptions: { agent }
        });
        inputplaylist.delete(message.guildId!);
        return [ getyt, { type: "video", addembed: addembed } ];
      }
    } else {
      inputplaylist.delete(message.guildId!);
      return [ undefined, { type: "playlist", err: "notfound" } ];
    }
  } else {
    let list = await ytsr(text, {
      gl: 'KO',
      limit: 1,
      requestOptions: { agent }
    });
    if (list && list.items && list.items.length > 0) {
      let getinfo = undefined;
      if (list.items[0].type === "video") {
        getinfo = await ytdl.getInfo(list.items[0].url, {
          lang: "KR",
          requestOptions: { agent }
        });
      }
      inputplaylist.delete(message.guildId!);
      return [ getinfo, { type: "video" } ];
    } else {
      inputplaylist.delete(message.guildId!);
      return [ undefined, { type: "video", err: "notfound" } ];
    }
  }
}

function checkurl(text: string) {
  var checkvideo = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  var checklist = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
  return {
    video: text.match(checkvideo),
    list: text.match(checklist)
  };
}
