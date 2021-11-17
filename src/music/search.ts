import { client } from "..";
import ytsr from "ytsr";
import ytpl from "ytpl";
import MDB from "../database/Mongodb";
import { nowplay } from "../database/obj/guild";
import { M } from "../aliases/discord.js";
import setmsg from "./msg";

type Vtype = "video" | "playlist" | "database";
type Etype = "notfound";

export default async function search(message: M, text: string): Promise<[ytsr.Item | undefined, { type?: Vtype, err?: Etype }]> {
  let url = checkurl(text);
  if (url.video) {
    let yid = url.video[1].replace(/\&.+/g,'');
    let list = await ytsr(`https://www.youtube.com/watch?v=${yid}`, {
      gl: 'KO',
      hl: 'KR',
      limit: 1
    }).catch((err) => {
      return undefined;
    });
    if (list && list.items) {
      return [ list.items[0], { type: "video" } ];
    } else {
      return [ undefined, { type: "video", err: "notfound" } ];
    }
  } else if (url.list) {
    let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (!guildDB) return [ undefined, { type: "database", err: "notfound" } ];

    let yid = url.list[1].replace(/\&.+/g,'');
    let list = await ytpl(yid, {
      limit: (guildDB.options.listlimit) ? guildDB.options.listlimit+1 : 301
    }).catch((err) => {
      return undefined;
    });
    if (list && list.items && list.items.length > 0) {
      if (guildDB.playing) {
        let queuelist: nowplay[] = [];
        list.items.forEach((data) => {
          queuelist.push({
            title: data.title,
            duration: data.duration!,
            author: data.author.name,
            url: data.shortUrl,
            image: (data.thumbnails[0].url) ? data.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
            player: `<@${message.author.id}>`
          });
        });
        guildDB.queue = guildDB.queue.concat(queuelist);
        await guildDB.save().catch((err) => { if (client.debug) console.log('데이터베이스오류:', err) });
        setmsg(message);
        return [ undefined, { type: "playlist" } ];
      } else {
        let output = list.items.shift();
        let queuelist: nowplay[] = [];
        list.items.forEach((data) => {
          queuelist.push({
            title: data.title,
            duration: data.duration!,
            author: data.author.name,
            url: data.shortUrl,
            image: (data.thumbnails[0].url) ? data.thumbnails[0].url : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
            player: `<@${message.author.id}>`
          });
        });
        guildDB.queue = guildDB.queue.concat(queuelist);
        await guildDB.save().catch((err) => { if (client.debug) console.log('데이터베이스오류:', err) });
        if (!output) return [ undefined, { type: "video", err: "notfound" } ];
        let getyt = await ytsr(output.shortUrl, {
          gl: 'KO',
          hl: 'KR',
          limit: 1
        });
        return [ getyt.items[0], { type: "video" } ];
      }
    } else {
      return [ undefined, { type: "playlist", err: "notfound" } ];
    }
  } else {
    let list = await ytsr(text, {
      gl: 'KO',
      hl: 'KR',
      limit: 1
    });
    if (list && list.items && list.items.length > 0) {
      return [ list.items[0], { type: "video" } ];
    } else {
      return [ undefined, { type: "video", err: "notfound" } ];
    }
  }
  return [ undefined, { type: "video", err: "notfound" } ];
}

function checkurl(text: string) {
  var checkvideo = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  var checklist = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
  return {
    video: text.match(checkvideo),
    list: text.match(checklist)
  };
}
