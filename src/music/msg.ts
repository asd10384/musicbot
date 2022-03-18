import { client } from "../index";
import { guild_type } from "../database/obj/guild";
import MDB from "../database/Mongodb";
import { Guild, TextChannel } from "discord.js";

export default async function setmsg(guild: Guild, pause?: boolean) {
  MDB.module.guild.findOne({ id: guild.id }).then(async (guildDB) => {
    if (guildDB) {
      let text = await setlist(guildDB);
      let embed = await setembed(guildDB, pause);
      let channel = guild.channels.cache.get(guildDB.channelId);
      (channel as TextChannel).messages.cache.get(guildDB.msgId)?.edit({ content: text, embeds: [embed] }).catch((err) => {});
    }
  });
}

async function setlist(guildDB: guild_type) {
  let musicDB = client.musicdb(guildDB.id);
  var output = '__**대기열 목록:**__';
  var list: string[] = [];
  var length = output.length + 20;
  let queue = musicDB.queue;
  let queuenumber = musicDB.queuenumber;
  if (queuenumber.length > 0) {
    for (let i=0; i<queuenumber.length; i++) {
      let data = queue[queuenumber[i]];
      let text = `\n${i+1}. ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title} [${await settime(data.duration)}]${(guildDB.options.player) ? ` ~ ${data.player}` : ''}`;
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

async function setembed(guildDB: guild_type, pause?: boolean) {
  let musicDB = client.musicdb(guildDB.id);
  let data = musicDB.nowplaying!;
  var title = '';
  if (musicDB.playing) {
    title = `**[${await settime(data.duration)}] - ${(guildDB.options.author) ? `${data.author} - ` : ''}${data.title}**`;
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
  if (musicDB.playing) {
    em.setFooter({ text: `대기열: ${musicDB.queue.length}개 | Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | 자동재생: 활성화" : ""}${(pause) ? ` | 노래가 일시중지 되었습니다.` : ''}` });
  } else {
    em.setFooter({ text: `Volume: ${guildDB.options.volume}%${guildDB.options.recommend ? " | 자동재생: 활성화" : ""}` });
  }
  return em;
}

async function settime(time: string | number): Promise<string> {
  time = Number(time);
  if (time === 0) return "실시간";
  var list: string[] = [];
  if (time > 3600) {
    list.push(az(Math.floor(time/3600)));
    list.push(az(Math.floor((time % 3600) / 60)));
    list.push(az(Math.floor((time % 3600) % 60)));
  } else {
    list.push(az(Math.floor(time / 60)));
    list.push(az(Math.floor(time % 60)));
  }
  return list.join(":");
}

function az(n: number): string {
  return (n < 10) ? '0' + n : '' + n;
}