import { client } from "..";
import mkembed from "../function/mkembed.js";
import { I, M } from "../aliases/discord.js";
import search from "./search.js";
import MDB from "../database/Mongodb";
import play from "./play";
import queue from "./queue";

export default async function music(message: M, text: string) {
  let getsearch = await search(message, text);
  if (getsearch) {
    let guildDB = await MDB.get.guild(message);
    if (guildDB) {
      if (getsearch.type === 'video') {
        if (guildDB.playing) {
          queue(message, getsearch);
        } else {
          play(message, getsearch);
        }
      } else {
        return message.channel?.send({
          embeds: [
            mkembed({
              title: `영상을 찾을수 없습니다.`,
              color: 'DARK_RED'
            })
          ]
        }).then(m => client.msgdelete(m, 0.5));
      }
    } else {
      return message.channel?.send({
        embeds: [
          mkembed({
            title: `알수없는 오류발생.`,
            description: '다시 시도해주세요.',
            color: 'DARK_RED'
          })
        ]
      }).then(m => client.msgdelete(m, 0.5));
    }
  } else {
    return message.channel?.send({
      embeds: [
        mkembed({
          title: `영상을 찾을수 없습니다.`,
          color: 'DARK_RED'
        })
      ]
    }).then(m => client.msgdelete(m, 0.5));
  }
}