import "dotenv/config";
import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js.js";
import { TextChannel } from "discord.js";
import MDB, { guild_type } from "../database/Mysql";
import { DiscordGatewayAdapterCreator, joinVoiceChannel } from "@discordjs/voice";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** Music 명령어 */
export default class MusicCommand implements Command {
  /** 해당 명령어 설명 */
  name = "music";
  visible = true;
  description = "play music";
  information = "디스코드에서 노래 재생";
  aliases = [ "음악" ];
  metadata = <D>{
    name: this.name,
    description: this.description,
    options: [
      {
        type: 'SUB_COMMAND',
        name: 'create_channel',
        description: 'Create a channel for the bot to use'
      },
      {
        type: 'SUB_COMMAND',
        name: 'fix',
        description: 'error resolution'
      },
      {
        type: 'SUB_COMMAND',
        name: 'search',
        description: 'search soung'
      },
      {
        type: "SUB_COMMAND",
        name: "join",
        description: "bot join voice channel",
        options: [{
          type: "CHANNEL",
          channelTypes: [ "GUILD_VOICE", "GUILD_STAGE_VOICE" ],
          name: "channel",
          description: "set channel",
          required: true
        }]
      }
    ]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    const cmd = interaction.options.getSubcommand();
    if (cmd === 'create_channel') {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      let guildDB = await MDB.get.guild(interaction.guild!);
      return await interaction.editReply({ content: await this.create_channel(interaction, guildDB!) });
    }
    if (cmd === 'fix') {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      let guildDB = await MDB.get.guild(interaction.guild!);
      if (guildDB) {
        return await interaction.editReply({ content: await this.fix(interaction, guildDB) });
      }
      return await interaction.editReply({ content: "데이터베이스를 찾을수 없습니다." })
    }
    if (cmd === "join") {
      const channel = interaction.options.getChannel("channel", true);
      joinVoiceChannel({
        adapterCreator: interaction.guild!.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        channelId: channel.id,
        guildId: interaction.guildId!
      });
      return await interaction.editReply({ content: "done!" });
    }
  }

  async create_channel(message: M | I, guildDB: guild_type): Promise<string> {
    if (!guildDB) return `데이터베이스 오류\n다시시도해주세요.`;
    const channel = await message.guild?.channels.create(`MUSIC_CHANNEL${(process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : ''}`, {
      type: 'GUILD_TEXT',
      topic: `Type in chat to play`
    });
    const msg = await channel?.send({
      content: `__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`,
      embeds: [
        client.mkembed({
          title: `**현재 노래가 재생되지 않았습니다**`,
          image: `https://cdn.hydra.bot/hydra_no_music.png`,
          footer: { text: `PREFIX: ${client.prefix}` },
          color: client.embedcolor
        })
      ]
    });
    guildDB.channelId = channel?.id ? channel.id : "null";
    guildDB.msgId = msg?.id ? msg.id : "null";
    return await MDB.update.guild(guildDB.id, { channelId: guildDB.channelId, msgId: guildDB.msgId }).then((val) => {
      if (!val) return `데이터베이스 오류\n다시시도해주세요.`;
      msg?.react('⏯️');
      msg?.react('⏹️');
      msg?.react('⏭️');
      msg?.react('🔀');
      return `<#${channel?.id!}> creation complete!`;
    }).catch((err) => {
      return `데이터베이스 오류\n다시시도해주세요.`;
    });
  }

  async fix(message: M | I, guildDB: guild_type): Promise<string> {
    client.getmc(message.guild!).setinputplaylist(false);
    let channel = message.guild?.channels.cache.get(guildDB.channelId);
    if (channel) {
      await (channel as TextChannel).messages.fetch().then((msg) => {
        try {
          if (msg.size > 0) (channel as TextChannel).bulkDelete(msg.size).catch((err) => { if (client.debug) console.log('메세지 전체 삭제 오류'); });
        } catch (err) {}
      });
    } else {
      channel = await message.guild?.channels.create(`MUSIC_CHANNEL${(process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : ''}`, {
        type: 'GUILD_TEXT',
        topic: `Type in chat to play`
      });
    }
    const msg = await (channel as TextChannel).send({
      content: `__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`,
      embeds: [
        client.mkembed({
          title: `**현재 노래가 재생되지 않았습니다**`,
          image: `https://cdn.hydra.bot/hydra_no_music.png`,
          footer: { text: `PREFIX: ${client.prefix}` },
          color: client.embedcolor
        })
      ]
    });
    guildDB.channelId = channel?.id ? channel.id : "null";
    guildDB.msgId = msg?.id ? msg.id : "null";
    return await MDB.update.guild(guildDB.id, { channelId: guildDB.channelId, msgId: guildDB.msgId }).then((val) => {
      if (!val) return `데이터베이스 오류\n다시시도해주세요.`;
      msg?.react('⏯️');
      msg?.react('⏹️');
      msg?.react('⏭️');
      msg?.react('🔀');
      client.getmc(msg.guild!).stop(true, "command-music-fix");
      return `Error correction completed!`;
    }).catch((err) => {
      return `데이터베이스 오류\n다시시도해주세요.`;
    });
  }
}