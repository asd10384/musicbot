import { client } from "..";
import { M, PM } from "../aliases/discord.js";
import { guild_type, nowplay } from "../database/obj/guild";
import MDB from "../database/Mongodb";
import { TextChannel } from "discord.js";
import mkembed from "../function/mkembed";

export default async function setmsg(message: M | PM) {
  MDB.get.guild(message).then((guildDB) => {
    if (guildDB) {
      let text = setlist(guildDB);
      let embed = setembed(guildDB);
      let channel = message.guild?.channels.cache.get(guildDB.channelId);
      (channel as TextChannel).messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] });
    }
  });
}

function setlist(guildDB: guild_type) {
  var output = '__**대기열 목록:**__';
  var list: string[] = [];
  var length = output.length + 20;
  let queue = guildDB.queue;
  if (queue.length > 0) {
    for (let i=0; i<queue.length; i++) {
      let data = queue[i];
      let text = `\n${i+1}. ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title} [${data.duration}]${(guildDB.options.player) ? ` ~ ${data.player}` : ''}`;
      if (length+text.length > 2000) {
        output += `\n+ ${queue.length-list.length}곡`;
        break;
      }
      length = length + text.length;
      list.push(text);
    }
    output += list.reverse().join('');
  } else {
    output += `\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`;
  }
  return output;
}

function setembed(guildDB: guild_type) {
  let data = guildDB.nowplay;
  var title = '';
  if (guildDB.playing) {
    title = `**[${data.duration}] - ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title}**`;
  } else {
    title = `**현재 노래가 재생되지 않았습니다**.`;
    data.image = 'https://cdn.hydra.bot/hydra_no_music.png';
  }
  let em = mkembed({
    title: title,
    image: data.image,
    url: data.url,
    color: 'ORANGE'
  });
  if (guildDB.playing && guildDB.options.player) em.setDescription(`노래 요청자: ${data.player}`);
  if (guildDB.playing) em.setFooter(`${guildDB.queue.length}개의 노래가 대기열에 있습니다. | Volume: ${guildDB.options.volume}%`);
  return em;
}