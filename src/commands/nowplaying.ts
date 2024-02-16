import { Bot } from "../index";
import { ChatInputApplicationCommandData, CommandInteraction, EmbedBuilder, Message } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";

export default class implements Command {
  permissions: boolean = false;
  name: string = "nowplaying";
  description: string = "music now playing";
  alias: string[] = [ "nowplay" ];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
  };
  msgData: { name: string; des: string; }[] = [];
  async msgRun(message: Message, _args: string[]) {
    return message.channel.send({ embeds: [ this.getEmbed(message.guild!.id) ] }).then(m => msgDelete(m, 6));
  }
  async slashRun(interaction: CommandInteraction) {
    return interaction.reply({ embeds: [ this.getEmbed(interaction.guild!.id) ], ephemeral: true });
  }

  getEmbed(guildId: string): EmbedBuilder {
    let mdb = Bot.music.getMDB(guildId);
    if (!mdb.playing?.id) return embedCreate({
      title: `\` 현재 재생중... \``,
      description: `재생중인 노래 없음`
    });
    return embedCreate({
      title: `\` 현재 재생중... \``,
      url: (mdb.playing.type === "spotify" ? "https://open.spotify.com/track/" : "https://youtu.be/") + mdb.playing.realId,
      description: `제목 : ${mdb.playing.title}\n가수 : ${mdb.playing.author}\n노래 요청자 : ${mdb.playing.player}`
    });
  }
}