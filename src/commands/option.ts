import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js";
import { Message, EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import QDB, { guilddata } from "../database/Quickdb";

/**
 * DB
 * let guildDB = await QDB.get(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** option 명령어 */
export default class OptionCommand implements Command {
  /** 해당 명령어 설명 */
  name = "option";
  visible = true;
  description = "set options";
  information = "설정";
  aliases: string[] = [ "옵션", "setting" ];
  metadata: D = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "volume",
        description: "볼륨",
        options: [{
          type: ApplicationCommandOptionType.Integer,
          name: "number",
          description: "값 (기본: 70)",
          minValue: 1,
          maxValue: 100
        }]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "player",
        description: "노래를 누가 넣었는지 표시",
        options: [{
          type: ApplicationCommandOptionType.Boolean,
          name: "boolean",
          description: "값 (기본: True)"
        }]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "recommend",
        description: "노래가 다끝나면 자동으로 노래 재생",
        options: [{
          type: ApplicationCommandOptionType.Boolean,
          name: "boolean",
          description: "값 (기본: False)"
        }]
      }
    ]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
    const guildDB = await QDB.get(interaction.guild!);
    const cmd = interaction.options.data[0];
    if (cmd.name === "volume") {
      const number = cmd.options ? cmd.options[0]?.value as number : null;
      return await interaction.followUp({ embeds: [ await this.volume(interaction, guildDB, number) ] });
    }
    if (cmd.name === "player") {
      const boolean = cmd.options ? cmd.options[0]?.value as boolean : null;
      return await interaction.followUp({ embeds: [ await this.player(interaction, guildDB, boolean) ] });
    }
    if (cmd.name === "recommend") {
      const boolean = cmd.options ? cmd.options[0]?.value as boolean : null;
      return await interaction.followUp({ embeds: [ await this.recommend(interaction, guildDB, boolean) ] });
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

  async volume(message: M | I, guildDB: guilddata, number: number | null): Promise<EmbedBuilder> {
    if (number == null) return client.mkembed({
      title: `**현재 볼륨: ${guildDB.options.volume}%**`,
      footer: { text: "기본 볼륨: 70%" }
    });
    guildDB.options.volume = number;
    return await QDB.set(guildDB.id, { options: guildDB.options }).then((val) => {
      if (!val) return client.mkembed({
        title: `**볼륨 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DarkRed"
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
        color: "DarkRed"
      });
    });
  }

  async player(message: M | I, guildDB: guilddata, boolean: boolean | null): Promise<EmbedBuilder> {
    if (boolean == null) return client.mkembed({
      title: `**현재 플레이어 표시: ${guildDB.options.player ? "True" : "False"}**`,
      footer: { text: "기본 플레이어 표시: True" }
    });
    guildDB.options.player = boolean;
    return await QDB.set(guildDB.id, { options: guildDB.options }).then((val) => {
      if (!val) return client.mkembed({
        title: `**플레이어 표시 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DarkRed"
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
        color: "DarkRed"
      });
    });
  }

  async recommend(message: M | I, guildDB: guilddata, boolean: boolean | null): Promise<EmbedBuilder> {
    if (boolean == null) return client.mkembed({
      title: `**현재 자동재생: ${guildDB.options.recommend ? "True" : "False"}**`,
      footer: { text: "기본 자동재생: False" }
    });
    guildDB.options.recommend = boolean;
    return await QDB.set(guildDB.id, { options: guildDB.options }).then((val) => {
      if (!val) return client.mkembed({
        title: `**자동재생 설정 실패**`,
        description: `설정 중 오류가 발생했습니다.`,
        color: "DarkRed"
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
        color: "DarkRed"
      });
    });
  }
}