import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { SlashCommand as Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { MessageActionRow, MessageButton, TextChannel } from "discord.js";
import mkembed from "../function/mkembed";
import MDB from "../database/Mongodb";
import stop from "../music/stop";

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
  metadata = <D>{
    name: 'music',
    description: 'play music',
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
        type: 'SUB_COMMAND',
        name: 'play',
        description: 'song play',
        options: [{
          type: 'STRING',
          name: 'text',
          description: 'SONG TITLE OR URL',
          required: true
        }]
      }
    ]
  };

  /** 실행되는 부분 */
  async run(interaction: I) {
    let cmd = interaction.options.getSubcommand(true);
    let text = interaction.options.getString('text');
    if (cmd === 'create_channel') {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      let guildDB = await MDB.get.guild(interaction);
      const channel = await interaction.guild?.channels.create('MUSIC_CHANNEL', {
        type: 'GUILD_TEXT',
        topic: `Type in chat to play`
      });
      const msg = await channel?.send({
        content: `__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`,
        embeds: [
          mkembed({
            title: `**현재 노래가 재생되지 않았습니다**`,
            image: `https://cdn.hydra.bot/hydra_no_music.png`,
            footer: { text: `PREFIX: ${client.prefix}` },
            color: client.embedcolor
          })
        ]
      });
      guildDB!.channelId = channel?.id!;
      guildDB!.msgId = msg?.id!;
      await guildDB!.save();
      msg?.react('⏯️');
      msg?.react('⏹️');
      msg?.react('⏭️');
      msg?.react('🔀');
      await interaction.editReply({ content: `<#${channel?.id!}> creation complete!` });
    }
    if (cmd === 'fix') {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      let guildDB = await MDB.get.guild(interaction);
      if (guildDB) {
        let channel = interaction.guild?.channels.cache.get(guildDB.channelId);
        if (channel) {
          await (channel as TextChannel).messages.fetch().then((msg) => {
            try {
              if (msg.size > 0) (channel as TextChannel).bulkDelete(msg.size);
            } catch (err) {}
          });
        } else {
          channel = await interaction.guild?.channels.create('MUSIC_CHANNEL', {
            type: 'GUILD_TEXT',
            topic: `Type in chat to play`
          });
        }
        const msg = await (channel as TextChannel).send({
          content: `__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`,
          embeds: [
            mkembed({
              title: `**현재 노래가 재생되지 않았습니다**`,
              image: `https://cdn.hydra.bot/hydra_no_music.png`,
              footer: { text: `PREFIX: ${client.prefix}` },
              color: client.embedcolor
            })
          ]
        });
        guildDB!.channelId = channel?.id!;
        guildDB!.msgId = msg?.id!;
        await guildDB!.save();
        msg?.react('⏯️');
        msg?.react('⏹️');
        msg?.react('⏭️');
        msg?.react('🔀');
        stop(msg);
        await interaction.editReply({ content: `Error correction completed!` });
      }
    }
    if (cmd === 'play') {
      await interaction.editReply({ embeds: [
        mkembed({
          title: '현재 재작중입니다.',
          color: 'DARK_RED'
        })
      ] });
    }
  }
}