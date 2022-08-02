import { client } from "../index";
import { M } from "../aliases/discord.js.js";

export type parmas = {
  shuffle?: boolean;
}

export default async function music(message: M, text: string) {
  let args = text.trim().replace(/ +/g," ").split(" -");
  if (args.length === 0) return;
  const searchtext = args.shift()!.trim();
  args = args.map(val => val.trim().toUpperCase());
  const parmas: parmas = {
    shuffle: (args.includes("S")) ? true : false
  }
  const mc = client.getmc(message.guild!);
  const searching = await mc.search(message, searchtext, parmas);
  searching[2]?.delete().catch((err) => { if (client.debug) console.log('addembed 메세지 삭제 오류'); });
  if (searching[0]) {
    if (mc.playing) {
      return mc.addqueue(message, searching[0]);
    } else {
      return mc.play(message, searching[0]);
    }
  }
  return message.channel?.send({
    embeds: [
      client.mkembed({
        title: `${searching[1]}`,
        color: "DarkRed"
      })
    ]
  }).then(m => client.msgdelete(m, 1000*10, true));
}