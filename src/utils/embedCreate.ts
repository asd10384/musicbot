import { ColorResolvable, EmbedBuilder, EmbedField } from "discord.js";
import { config } from "../config/config";

export const embedCreate = (data: {
  title?: string,
  description?: string,
  url?: string,
  image?: string,
  thumbnail?: string,
  author?: { name: string, iconURL?: string, url?: string },
  addFields?: EmbedField[],
  timestamp?: number | Date | undefined | null,
  footer?: { text: string, iconURL?: string },
  color?: ColorResolvable
}): EmbedBuilder => {
  const embed = new EmbedBuilder();
  if (data.title) embed.setTitle(data.title);
  if (data.description) embed.setDescription(data.description);
  if (data.url) embed.setURL(data.url);
  if (data.image) embed.setImage(data.image);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.author) embed.setAuthor({ name: data.author.name, iconURL: data.author.iconURL, url: data.author.url });
  if (data.addFields) embed.addFields(data.addFields);
  if (data.timestamp) embed.setTimestamp(data.timestamp);
  if (data.footer) embed.setFooter({ text: data.footer.text, iconURL: data.footer.iconURL });
  if (data.color) embed.setColor(data.color);
  else embed.setColor(config.embedColor);
  return embed;
}
