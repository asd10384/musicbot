import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js";
import { Message, MessageEmbed } from "discord.js";
import MDB, { guild_type } from "../database/Mysql";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** 예시 명령어 */
export default class OptionCommand implements Command {
  /** 해당 명령어 설명 */
  name = "option";
  visible = true;
  description = "set options";
  information = "설정";
  aliases = [ "옵션", "setting" ];
  metadata = <D>{
    name: this.name,
    description: this.description,
    options: [
      {
        type: "SUB_COMMAND",
        name: "volume",
        description: "볼륨",
        options: [{
          type: "INTEGER",
          name: "number",
          description: "값 (기본: 70)",
          minValue: 1,
          maxValue: 100
        }]
      },
      {
        type: "SUB_COMMAND",
        name: "player",
        description: "노래를 누가 넣었는지 표시",
        options: [{
          type: "BOOLEAN",
          name: "boolean",
          description: "값 (기본: True)"
        }]
      },
      {
        type: "SUB_COMMAND",
        name: "recommend",
        description: "노래가 다끝나면 자동으로 노래 재생",
        options: [{
          type: "BOOLEAN",
          name: "boolean",
          description: "값 (기본: False)"
        }]
      }
    ]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
    const guildDB = await MDB.get.guild(interaction.guild!);
    if (!guildDB) return;
    const cmd = interaction.options.getSubcommand();
    if (cmd === "volume") {
      const number = interaction.options.getInteger("number");
      return await interaction.editReply({ embeds: [ await this.volume(interaction, guildDB, number) ] });
    }
    if (cmd === "player") {
      const boolean = interaction.options.getBoolean("boolean");
      return await interaction.editReply({ embeds: [ await this.player(interaction, guildDB, boolean) ] });
    }
    if (cmd === "recommend") {
      const boolean = interaction.options.getBoolean("boolean");
      return await interaction.editReply({ embeds: [ await this.recommend(interaction, guildDB, boolean) ] });
    }
  }
  async msgrun(message: Message, args: string[]) {
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `example`,
        description: `example`,
        footer: { text: `example` },
        color: client.embedcolor
      })
    ] }).then(m => client.msgdelete(m, 2));
  }

  async volume(message: M | I, guildDB: guild_type, number: number | null): Promise<MessageEmbed> {
    if (number == null) return client.mkembed({
      title: `**현재 볼륨: ${guildDB.options.volume}%**`,
      footer: { text: "기본 볼륨: 70%" }
    });
    guildDB.options.volume = number;
    return await MDB.update.guild(guildDB.id, { options: JSON.stringify(guildDB.options) }).then((val) => {
      if (!val) return client.mkembed({
        title: `**볼륨 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DARK_RED"
      });
      const mc = client.getmc(message.guild!);
      mc.setVolume(number);
      mc.setmsg();
      return client.mkembed({
        title: `**볼륨 설정완료**`,
        description: `**현재 볼륨: ${guildDB.options.volume}%**`,
        footer: { text: "기본 볼륨: 70%" }
      });
    }).catch((err) => {
      return client.mkembed({
        title: `**볼륨 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DARK_RED"
      });
    });
  }

  async player(message: M | I, guildDB: guild_type, boolean: boolean | null): Promise<MessageEmbed> {
    if (boolean == null) return client.mkembed({
      title: `**현재 플레이어 표시: ${guildDB.options.player ? "True" : "False"}**`,
      footer: { text: "기본 플레이어 표시: True" }
    });
    guildDB.options.player = boolean;
    return await MDB.update.guild(guildDB.id, { options: JSON.stringify(guildDB.options) }).then((val) => {
      if (!val) return client.mkembed({
        title: `**플레이어 표시 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DARK_RED"
      });
      return client.mkembed({
        title: `**플레이어 표시 설정완료**`,
        description: `**플레이어 표시: ${guildDB.options.player ? "True" : "False"}**`,
        footer: { text: "기본 플레이어 표시: True" }
      });
    }).catch((err) => {
      return client.mkembed({
        title: `**플레이어 표시 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DARK_RED"
      });
    });
  }

  async recommend(message: M | I, guildDB: guild_type, boolean: boolean | null): Promise<MessageEmbed> {
    if (boolean == null) return client.mkembed({
      title: `**현재 자동재생: ${guildDB.options.recommend ? "True" : "False"}**`,
      footer: { text: "기본 자동재생: False" }
    });
    guildDB.options.recommend = boolean;
    return await MDB.update.guild(guildDB.id, { options: JSON.stringify(guildDB.options) }).then((val) => {
      if (!val) return client.mkembed({
        title: `**자동재생 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DARK_RED"
      });
      client.getmc(message.guild!).setmsg();
      return client.mkembed({
        title: `**자동재생 설정완료**`,
        description: `**자동재생: ${guildDB.options.recommend ? "True" : "False"}**`,
        footer: { text: "기본 자동재생: False" }
      });
    }).catch((err) => {
      return client.mkembed({
        title: `**자동재생 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DARK_RED"
      });
    });
  }
}