import { client } from "../index";
import { M } from "../aliases/discord.js.js";
import search from "./search";
import MDB from "../database/Mongodb";
import queue from "./queue";

export default async function music(message: M, text: string) {
  let args = text.split(' -');
  if (args.length === 0) return;
  const searchtext = args.shift()!.trim();
  args = args.map(val => val.trim().toUpperCase());

  const searching = await search(message, searchtext, {
    shuffle: (args.includes("S")) ? true : false
  });
  const getsearch = searching[0];
  const options = searching[1];
  if (options.addembed) options.addembed.delete().catch((err) => { if (client.debug) console.log('addembed 메세지 삭제 오류') });
  if (getsearch) {
    const mc = client.getmc(message.guild!);
    let guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (guildDB) {
      if (mc.playing) {
        queue(message, getsearch);
      } else {
        mc.play(message, getsearch);
      }
    } else {
      return message.channel?.send({
        embeds: [
          client.mkembed({
            title: `데이터베이스 오류발생`,
            description: '다시 시도해주세요.',
            color: "DARK_RED"
          })
        ]
      }).then(m => client.msgdelete(m, 0.5));
    }
  } else {
    if (options.type === "playlist") {
      if (options.err === "notfound") {
        return message.channel?.send({
          embeds: [
            client.mkembed({
              title: `플레이리스트를 찾을수 없습니다.`,
              color: "DARK_RED"
            })
          ]
        }).then(m => client.msgdelete(m, 0.5));
      }
      if (options.err === "added") {
        return message.channel?.send({
          embeds: [
            client.mkembed({
              title: `현재 플레이리스트를 추가하는중입니다.\n잠시뒤 사용해주세요.`,
              color: "DARK_RED"
            })
          ]
        }).then(m => client.msgdelete(m, 1));
      }
      return;
    }
    if (options.type === "video") {
      if (options.err === "livestream") {
        return message.channel?.send({
          embeds: [
            client.mkembed({
              title: `실시간 영상은 재생할 수 없습니다.`,
              color: "DARK_RED"
            })
          ]
        }).then(m => client.msgdelete(m, 0.5));
      }
      if (options.err === "notfound") {
        return message.channel?.send({
          embeds: [
            client.mkembed({
              title: `영상을 찾을수 없습니다.`,
              color: "DARK_RED"
            })
          ]
        }).then(m => client.msgdelete(m, 0.5));
      }
    }
    return message.channel?.send({
      embeds: [
        client.mkembed({
          title: `오류발생`,
          description: `다시 시도해주세요.`,
          color: "DARK_RED"
        })
      ]
    }).then(m => client.msgdelete(m, 0.5));
  }
}