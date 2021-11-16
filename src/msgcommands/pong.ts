import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { MsgCommand as Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import mkembed from "../function/mkembed";
import MDB from "../database/Mongodb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** 퐁 명령어 */
export default class PongCommand implements Command {
  /** 해당 명령어 설명 */
  metadata = {
    name: 'pong',
    description: 'Pong!',
    aliases: ['퐁']
  };

  /** 실행되는 부분 */
  async run(message: M, args: string[]) {
    message.channel.send({
      embeds: [
        mkembed({
          title: `Ping!`,
          description: `**${client.ws.ping}ms**`,
          footer: { text: `이 메세지는 곧 삭제됩니다.` },
          color: client.embedcolor
        })
      ]
    }).then(m => client.msgdelete(m, 1.5));
  }
}