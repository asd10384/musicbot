import { Bot } from "../index";
import { ActionRowBuilder, AnySelectMenuInteraction, ChatInputApplicationCommandData, CommandInteraction, EmbedBuilder, Message, StringSelectMenuBuilder } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";

export default class implements Command {
  permissions: boolean = false;
  name: string = "queue";
  description: string = "music queue";
  alias: string[] = [ "재생목록" ];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
  };
  msgData: { name: string; des: string; }[] = [];
  async msgRun(message: Message, _args: string[]) {
    return message.channel.send(this.getEmbed(message.guild!.id, 1)).then(m => msgDelete(m, 6));
  }
  async slashRun(interaction: CommandInteraction) {
    return interaction.reply({
      ...this.getEmbed(interaction.guild!.id, 1),
      ephemeral: true
    });
  }
  async menuRun(interaction: AnySelectMenuInteraction, args: string[]) {
    return interaction.reply({
      ...this.getEmbed(interaction.guild!.id, Number(args[0]) || 1),
      ephemeral: true
    });
  }

  getEmbed(guildId: string, count: number): { embeds: EmbedBuilder[]; components?: ActionRowBuilder<StringSelectMenuBuilder>[] } {
    let mdb = Bot.music.getMDB(guildId);
    if (!mdb.playing || !mdb.queue) return { embeds: [ embedCreate({
      title: `\` 재생목록 (1/1) \``,
      description: `없음`
    }) ] };
    let embeds: EmbedBuilder[] = [];
    for (let i=0; i<mdb.queue.length; i++) {
      let num = Math.floor(i/20);
      if (embeds[num]) embeds[num] = embedCreate({ title: `\` 재생목록 (${num*20+1}~/${(num+1)*20}) \``, description: '' });
      embeds[num].setDescription(
        (embeds[num].data.description || '')
        +`${
          (i+1).toString().padStart(mdb.queue.length.toString().length, '0')
        }\\. ${
          mdb.queue[num].author.replace(" - Topic",'')
        } - ${
          mdb.queue[num].title
        } [${
          Bot.music.setTime(mdb.queue[num].duration)
        }] ~ ${
          mdb.queue[num].player === "자동재생" ? mdb.queue[num].player : `<@${mdb.queue[num].player}>`
        }`
      );
    }
    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("queue")
        .setPlaceholder("다음번호를 보시려면 아래에서 선택해주세요.")
        .addOptions(embeds.map((em, i) => {
          return {
            label: `${em.data.title?.replace("재생목록 ",'') || ''}`,
            description: `이 페이지를 보시려면 선택해주세요.`,
            value: `${i+1}`
          };
        }))
    );
    return { embeds: [ embeds[count-1] ], components: [ actionRow ] };
  }
}