import { guildData, QDB } from "../databases/Quickdb";
import "dotenv/config";
import { client, handler } from "..";
import { Logger } from "../utils/Logger";
import { ChannelType } from "discord.js";
import { makeButton } from "../config/config";

export const onReady = () => {
  if (!client.user) return;
  const prefix = client.prefix;
  let actlist: { text: string, time: number }[] = eval(process.env.ACTIVITY || '[{ "text": `/help`, time: 10 }, { "text": `${prefix}help`, "time": 10 }]');

  Logger.ready(`Ready! ${client.user.username}`);
  Logger.ready(`prefix: ${prefix}`);
  Logger.ready(`Activity: ${JSON.stringify(actlist)}`);
  Logger.ready(`로그확인: ${client.debug}`);

  if (process.env.REFRESH_SLASH_COMMAND_ON_READY === "true") handler.registCachedCommands(client);

  musicfix();

  if (actlist.length < 1) return;
  client.user.setActivity(actlist[0].text);
  if (actlist.length < 2) return;
  let i = 1;
  let time = actlist[1].time;
  setInterval(() => {
    client.user?.setActivity(actlist[i].text);
    if (++i >= actlist.length) i = 0;
    time = actlist[i].time;
  }, time * 1000);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function musicfix() {
  QDB.guild.all().then((val: guildData[]) => {
    val.forEach((GDB) => {
      if (GDB.id && GDB.channelId) {
        const channel = client.guilds.cache.get(GDB.id)?.channels.cache.get(GDB.channelId);
        if (channel && channel.type === ChannelType.GuildText) {
          channel.messages.fetch().then(async (msgs) => {
            try {
              if (msgs.size > 0) channel.bulkDelete(msgs.size).catch(() => {
                if (client.debug) Logger.error('메세지 전체 삭제 오류');
              });
            } catch (err) {}
            await sleep(500);
            const msg = await channel.send({
              content: `__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`,
              embeds: [
                client.mkembed({
                  title: `**현재 노래가 재생되지 않았습니다**`,
                  image: `https://cdn.hydra.bot/hydra_no_music.png`,
                  footer: { text: `PREFIX: ${client.prefix}` }
                })
              ]
            });
            return await QDB.guild.set(GDB.id, {
              channelId: GDB.channelId,
              msgId: msg?.id ? msg.id : "null"
            }).then((val) => {
              if (!val) return `데이터베이스 오류\n다시시도해주세요.`;
              msg?.edit({ content: msg.content, embeds: msg.embeds, components: [ makeButton() ] });
              if (msg?.guild) {
                const mc = client.getmc(msg.guild);
                mc.stop(true, "onReady");
                Logger.ready(`${msg.guild.name} : 시작 fix 성공`);
                mc.sendlog(`시작 fix 성공`);
              }
              return;
            }).catch(() => {
              if (msg?.guild) {
                Logger.ready(`${msg.guild.name} : 시작 fix 실패`);
                client.getmc(msg.guild).sendlog(`시작 fix 실패`);
                return;
              }
            });
          }).catch(() => {});
        }
      }
    })
  })
}