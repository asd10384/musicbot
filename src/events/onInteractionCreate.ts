import { slash } from '..';
import { Interaction } from 'discord.js';
import runSMInteraction from '../function/SelectMenuInteraction';

export default async function onInteractionCreate (interaction: Interaction) {
  if (interaction.isSelectMenu()) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    runSMInteraction(interaction);
  }
  if (!interaction.isCommand()) return;

  /**
   * 명령어 친사람만 보이게 설정
   * ephemeral: true
   */
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  slash.runCommand(interaction);
}