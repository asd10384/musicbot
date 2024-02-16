import { config } from "./config";
import { embedCreate } from "../utils/embedCreate";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const default_channel_name = "음악채널";
export const default_channel_topic = "채팅으로 제목 또는 링크를 입력해 사용하세요.";

export const default_msg = "__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.";
export const default_embed = embedCreate({
  title: `**현재 노래가 재생되지 않았습니다**`,
  image: `https://cdn.hydra.bot/hydra_no_music.png`,
  footer: { text: `PREFIX: ${config.prefix}` }
});

export const makeButton = (data: {
  playing?: boolean;
  pause?: boolean;
  list?: boolean;
}) => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("music-play_pause")
    .setEmoji({ name: "⏯️" })
    .setStyle(data.pause ? ButtonStyle.Primary : ButtonStyle.Success)
    .setDisabled(!data.playing)
).addComponents(
  new ButtonBuilder()
    .setCustomId("music-stop")
    .setEmoji({ name: "⏹️" })
    .setStyle(ButtonStyle.Danger)
    .setDisabled(false)
).addComponents(
  new ButtonBuilder()
    .setCustomId("music-skip")
    .setEmoji({ name: "⏭️" })
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!data.playing)
).addComponents(
  new ButtonBuilder()
    .setCustomId("music-shuffle")
    .setEmoji({ name: "🔀" })
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!(data.playing && data.list))
).addComponents(
  new ButtonBuilder()
    .setCustomId("music-recommand")
    .setEmoji({ id: "1035604533532954654", name: "auto" })
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(false)
);