import { client } from "../..";
import { I } from "../../aliases/discord.js";
import { SelectMenuInteraction as S } from "discord.js";
import mkembed from "../mkembed";
import MDB from "../../database/Mongodb";

export default async function Queue(interaction: I | S, args: string[]) {
  let guildDB = await MDB.get.guild(interaction);
  if (guildDB) {
    let options = guildDB.options;
    var list: string[] = [];
    guildDB.queue.forEach((data, i) => {
      if (!list[Math.floor(i/client.maxqueue)]) list[Math.floor(i/client.maxqueue)] = '';
      list[Math.floor(i/client.maxqueue)] += `${i+1}. ${data.title} [${data.duration}]${(options.player) ? ` ~ ${data.player}` : ''}\n`;
    });
    const embed = mkembed({
      title: `${Number(args[0])+1}번째 QUEUE ${((Number(args[0])-1)*client.maxqueue)+1}~${((Number(args[0])-1)*30)+30}`,
      description: list[Number(args[0])],
      color: client.embedcolor
    });
    return await interaction.editReply({ embeds: [ embed ] });
  }
}