import { SelectMenuInteraction as S } from "discord.js";

import Help from "./SelectMenus/Help";
import Queue from "./SelectMenus/Queue";

export default function runSMInteraction(interaction: S) {
  const commandName = interaction.customId;
  const args = interaction.values;
  if (commandName === 'help') Help(interaction, args);
  if (commandName === 'queue') Queue(interaction, args);
}