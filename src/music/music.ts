import { client } from "../index";
import { M } from "../aliases/discord.js.js";
import QDB from "../database/Quickdb";
import ytdl from "ytdl-core";

export type parmas = {
  shuffle?: boolean;
}

export default async function music(message: M, text: string) {
  let args = text.trim().replace(/ +/g," ").split(" -");
  if (args.length === 0) return;
  const mc = client.getmc(message.guild!);
  if (!await mc.getchannel(message)) return message.channel.send({ embeds: [
    client.mkembed({
      title: '음성채널을 찾을수 없습니다.',
      description: '음성채널에 들어가서 사용해주세요.',
      footer: { text: `${message.member?.nickname || message.member?.user?.username}님에게 보내는 메세지` },
      color: "DarkRed"
    })
  ] }).then(m => client.msgdelete(m, 1));
  const searchtext = args.shift()!.trim();
  args = args.map(val => val.trim().toUpperCase());
  const parmas: parmas = {
    shuffle: (args.includes("S")) ? true : false
  }
  const searching = await mc.search(message, searchtext, parmas);
  searching[2]?.delete().catch((err) => { if (client.debug) console.log('addembed 메세지 삭제 오류'); });
  if (searching[0]) {
    if (mc.playing) {
      return addqueue(message, searching[0]);
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

async function addqueue(message: M, getsearch: ytdl.videoInfo) {
  let getinfo = getsearch.videoDetails;
  await QDB.addqueue(message.guildId!, {
    title: getinfo.title,
    duration: getinfo.lengthSeconds,
    author: getinfo.author!.name,
    url: getinfo.video_url,
    image: (getinfo.thumbnails.length > 0 && getinfo.thumbnails[getinfo.thumbnails.length-1]?.url) ? getinfo.thumbnails[getinfo.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
    player: `<@${message.author.id}>`
  });
  client.getmc(message.guild!).setmsg();
}