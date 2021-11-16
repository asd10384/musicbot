import { ColorResolvable, EmbedFieldData, MessageEmbed } from "discord.js";

export default function mkembed(data: {
  title?: string,
  description?: string,
  url?: string,
  image?: string,
  thumbnail?: string,
  author?: { name: string, iconURL?: string, url?: string },
  addField?: { name: string, value: string, inline?: boolean },
  addFields?: EmbedFieldData[],
  timestamp?: number | Date | undefined | null,
  footer?: { text: string, iconURL?: string },
  color?: ColorResolvable
}): MessageEmbed {
  const embed = new MessageEmbed();
  if (data.title) embed.setTitle(data.title);
  if (data.description) embed.setDescription(data.description);
  if (data.url) embed.setURL(data.url);
  if (data.image) embed.setImage(data.image);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.author) embed.setAuthor(data.author.name, data.author.iconURL, data.author.url);
  if (data.addField) embed.addField(data.addField.name, data.addField.value, data.addField.inline);
  if (data.addFields) embed.addFields(data.addFields);
  if (data.timestamp) embed.setTimestamp(data.timestamp);
  if (data.footer) embed.setFooter(data.footer.text, data.footer.iconURL);
  if (data.color) embed.setColor(data.color);
  return embed;
}