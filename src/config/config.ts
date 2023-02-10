import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

export const makeButton = (color: boolean = true, play_pause: boolean = true, stop: boolean = false, skip: boolean = true, shuffle: boolean = true, recommand: boolean = false): ActionRowBuilder<ButtonBuilder> => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("music-play_pause")
      .setEmoji({ name: "⏯️" })
      .setStyle(color ? ButtonStyle.Primary : ButtonStyle.Success)
      .setDisabled(play_pause)
  ).addComponents(
    new ButtonBuilder()
      .setCustomId("music-stop")
      .setEmoji({ name: "⏹️" })
      .setStyle(ButtonStyle.Danger)
      .setDisabled(stop)
  ).addComponents(
    new ButtonBuilder()
      .setCustomId("music-skip")
      .setEmoji({ name: "⏭️" })
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(skip)
  ).addComponents(
    new ButtonBuilder()
      .setCustomId("music-shuffle")
      .setEmoji({ name: "🔀" })
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(shuffle)
  ).addComponents(
    new ButtonBuilder()
      .setCustomId("music-recommand")
      .setEmoji({ id: "1035604533532954654", name: "auto" })
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(recommand)
  );
}