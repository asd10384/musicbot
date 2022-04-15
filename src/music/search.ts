import { client } from "../index";
import ytsr from "ytsr";
import ytpl from "ytpl";
import MDB from "../database/Mongodb";
import { M } from "../aliases/discord.js.js";
import ytdl from "ytdl-core";
import { fshuffle } from "./shuffle";
import setmsg from "./msg";

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
      lang: "KR"
    }).catch((err) => {
      return undefined;
    });
    if (getinfo && getinfo.videoDetails) {
      if (getinfo.videoDetails.lengthSeconds === "0") return [ undefined, { type: "video", err: "livestream" } ];
      return [ getinfo, { type: "video" } ];
    } else {
      return [ undefined, { type: "video", err: "notfound" } ];
    }
  } else if (url.list) {
    let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (!guildDB) return [ undefined, { type: "database", err: "notfound" } ];
    inputplaylist.add(message.guildId!);
    const mc = client.getmc(message.guild!);
    const addedembed = await message.channel.send({ embeds: [
      client.mkembed({
        description: `<@${message.author.id}> 플레이리스트 확인중...\n(노래가 많으면 많을수록 오래걸립니다.)`,
        color: client.embedcolor
      })
    ] }).catch((err) => {
      return undefined;
    });
    let list = await ytpl(url.list[1].replace(/\&.+/g,''), {
      gl: "KR",
      limit: 50000 // (guildDB.options.listlimit) ? guildDB.options.listlimit : 300
    }).catch((err) => {
      if (client.debug) console.log(err);
      return undefined;
    });
    addedembed?.delete().catch((err) => {});
    if (list && list.items && list.items.length > 0) {
      if (client.debug) console.log(message.guild?.name, list.title, list.items.length, (guildDB.options.listlimit) ? guildDB.options.listlimit : 300);
      const addembed = await message.channel.send({ embeds: [
        client.mkembed({
          title: `\` ${list.title} \` 플레이리스트 추가중...`,
          description: `재생목록에 \` ${list.items.length} \` 곡 ${parmas?.shuffle ? "섞어서 " : ""}추가중`,
          color: client.embedcolor
        })
      ] }).catch((err) => {
        return undefined;
      });
      if (parmas?.shuffle) list.items = await fshuffle(list.items);
      if (mc.playing) {
        mc.setqueue(
          mc.queue.concat(list.items.map((data) => {
            return {
              title: data.title,
              duration: data.durationSec!.toString(),
              author: data.author.name,
              url: data.shortUrl,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          })),
          mc.queuenumber.concat(list.items.map((data, i) => {
          return mc.queue.length+i;
          }))
        );
        setmsg(message.guild!);
        inputplaylist.delete(message.guildId!);
        return [ undefined, { type: "playlist", addembed: addembed } ];
      } else {
        const output = list.items.shift()!;
        mc.setqueue(
          mc.queue.concat(list.items.map((data) => {
            return {
              title: data.title,
              duration: data.durationSec!.toString(),
              author: data.author.name,
              url: data.shortUrl,
              image: (data.thumbnails.length > 0 && data.thumbnails[data.thumbnails.length-1]?.url) ? data.thumbnails[data.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
              player: `<@${message.author.id}>`
            }
          })),
          mc.queuenumber.concat(list.items.map((data, i) => {
          return mc.queue.length+i;
          }))
        );
        let getyt = await ytdl.getInfo(output.shortUrl, {
          lang: "KR"
        });
        inputplaylist.delete(message.guildId!);
        if (getyt && getyt.videoDetails) {
          if (getyt.videoDetails.lengthSeconds === "0") return [ undefined, { type: "video", err: "livestream" } ];
          return [ getyt, { type: "video", addembed: addembed } ];
        } else {
          return [ undefined, { type: "video", err: "notfound" } ];
        }
      }
    } else {
      inputplaylist.delete(message.guildId!);
      return [ undefined, { type: "playlist", err: "notfound" } ];
    }
  } else {
    let list = await ytsr(text, {
      gl: 'KO',
      limit: 1
    });
    if (list && list.items && list.items.length > 0) {
      list.items = list.items.filter((item) => item.type === "video");
      if (list.items.length > 0 && list.items[0].type === "video") {
        let getinfo = await ytdl.getInfo(list.items[0].url, {
          lang: "KR"
        });
        inputplaylist.delete(message.guildId!);
        if (getinfo && getinfo.videoDetails) {
          if (getinfo.videoDetails.lengthSeconds === "0") return [ undefined, { type: "video", err: "livestream" } ]
          return [ getinfo, { type: "video" } ];
        } else {
          return [ undefined, { type: "video", err: "notfound" } ];
        }
      }
    }
    inputplaylist.delete(message.guildId!);
    return [ undefined, { type: "video", err: "notfound" } ];
  }
}

function checkurl(text: string) {
  const checkvideo = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  const checklist = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
  return {
    video: text.match(checkvideo),
    list: text.match(checklist)
  };
}
