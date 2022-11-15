import "dotenv/config";
import { client, handler } from "../index";
import QDB, { guilddata } from "../database/Quickdb";
import { ChannelType } from "discord.js";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** onReady 핸들러 */
export default function onReady() {
  if (!client.user) return;

  const prefix = client.prefix;
  let actlist: { text: string, time: number }[] = eval(process.env.ACTIVITY!);

  console.log('Ready!', client.user.username);
  console.log('Activity:', JSON.stringify(actlist));
  console.log('로그확인:', client.debug);

  if (process.env.REFRESH_SLASH_COMMAND_ON_READY === 'true') handler.registCachedCommands(client);

  musicfix();

  if (process.env.ENVIROMENT === "DEV") {
    client.user.setActivity("봇 수정");
    return;
  }
  client.user.setActivity(actlist[0].text);
  let i = 1;
  let time = actlist[1].time;
  setInterval(() => {
    client.user?.setActivity(actlist[i].text);
    if (++i >= actlist.length) i = 0;
    time = actlist[i].time;
  }, time * 1000);
}

function musicfix() {
  QDB.all().then((val: guilddata[]) => {
    val.forEach((guildDB) => {
      if (guildDB.id && guildDB.channelId) {
        const channel = client.guilds.cache.get(guildDB.id)?.channels.cache.get(guildDB.channelId);
        if (channel && channel.type === ChannelType.GuildText) {
          channel.messages.fetch().then(async (msgs) => {
            try {
              if (msgs.size > 0) channel.bulkDelete(msgs.size).catch((err) => { if (client.debug) console.log('메세지 전체 삭제 오류'); });
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
            guildDB.msgId = msg?.id ? msg.id : "null";
            return await QDB.set(guildDB.id, { channelId: guildDB.channelId, msgId: guildDB.msgId }).then((val) => {
              if (!val) return `데이터베이스 오류\n다시시도해주세요.`;
              msg?.react('⏯️');
              msg?.react('⏹️');
              msg?.react('⏭️');
              msg?.react('🔀');
              msg?.react('<:auto:1035604533532954654>');
              if (msg?.guild) {
                const mc = client.getmc(msg.guild);
                mc.stop(true, "onReady");
                console.log(`${msg.guild.name} : 시작 fix 성공`);
                mc.sendlog(`시작 fix 성공`);
              }
              return;
            }).catch((err) => {
              if (msg?.guild) {
                console.log(`${msg.guild.name} : 시작 fix 실패`);
                client.getmc(msg.guild).sendlog(`시작 fix 실패`);
                return;
              }
            });
          }).catch((err) => {});
        }
      }
    })
  })
}