import { client } from "..";
import { M, PM, I } from "../aliases/discord.js";
import { guild_type, nowplay } from "../database/obj/guild";
import MDB from "../database/Mongodb";
import { TextChannel } from "discord.js";

export default async function setmsg(message: M | PM | I, pause?: boolean) {
  MDB.module.guild.findOne({ id: message.guildId! }).then((guildDB) => {
    if (guildDB) {
      let text = setlist(guildDB);
      let embed = setembed(guildDB, pause);
      let channel = message.guild?.channels.cache.get(guildDB.channelId);
      (channel as TextChannel).messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] });
    }
  });
}

function setlist(guildDB: guild_type) {
  let musicDB = client.musicdb(guildDB.id);
  var output = '__**대기열 목록:**__';
  var list: string[] = [];
  var length = output.length + 20;
  let queue = musicDB.queue;
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

function setembed(guildDB: guild_type, pause?: boolean) {
  let musicDB = client.musicdb(guildDB.id);
  let data = musicDB.nowplaying!;
  var title = '';
  if (musicDB.playing) {
    title = `**[${data.duration}] - ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title}**`;
  } else {
    title = `**현재 노래가 재생되지 않았습니다**.`;
    data.image = 'https://cdn.hydra.bot/hydra_no_music.png';
  }
  let em = client.mkembed({
    title: title,
    image: data.image,
    url: data.url,
    color: client.embedcolor
  });
  if (musicDB.playing && guildDB.options.player) em.setDescription(`노래 요청자: ${data.player}`);
  if (musicDB.playing) em.setFooter(`${musicDB.queue.length}개의 노래가 대기열에 있습니다. | Volume: ${guildDB.options.volume}%${(pause) ? ` | 노래가 일시중지 되었습니다.` : ''}`);
  return em;
}