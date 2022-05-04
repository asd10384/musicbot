import "dotenv/config";
import { Guild } from "discord.js";
import { client } from "../index";
import MDB from "../database/Mysql";

/** onReady 핸들러 */
export default function guildDelete(guild: Guild) {
  MDB.get.guild(guild).then((guildDB) => {
    if (client.debug) {
      if (guildDB) {
        console.log(`서버 삭제 성공: ${guildDB.name}`);
      } else {
        console.log(`서버를 삭제 실패: 발견하지 못함`);
      }
    }
  }).catch((err) => {
    if (client.debug) console.log(`서버 삭제 실패: 오류발생`);
  });
}