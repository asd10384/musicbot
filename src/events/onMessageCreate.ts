import { ChannelType, Message, TextChannel } from "discord.js";
import { client, handler } from "..";
import { Logger } from "../utils/Logger";
import { QDB } from "../databases/Quickdb";
import { music } from "../music/music";

export const onMessageCreate = async (message: Message) => {
  if (message.author.bot || message.channel.type === ChannelType.DM) return;
  if (message.content.startsWith(client.prefix)) {
    const content = message.content.slice(client.prefix.length).trim();
    const args = content.split(/ +/g);
    const commandName = args.shift()?.toLowerCase();
    const command = handler.commands.get(commandName!) || handler.commands.find((cmd) => cmd.aliases.includes(commandName!));
    try {
      if (!command || !command.messageRun) return handler.err(message, commandName);
      command.messageRun(message, args);
    } catch(error) {
      if (client.debug) Logger.error(error as any); // 오류확인
      handler.err(message, commandName);
    } finally {
      client.msgdelete(message, 0, true);
    }
  } else {
    let GDB = await QDB.guild.get(message.guild!);
    if (GDB.channelId === message.channelId) {
      const getcooldown = handler.cooldown.get(`${message.guildId!}.${message.author.id}`);
      if (getcooldown && getcooldown > Date.now()) {
        (message.channel as TextChannel).send({ embeds: [
          client.mkembed({
            description: `**<@${message.author.id}>님 너무 빠르게 입력했습니다.**\n${((getcooldown - Date.now())/1000).toFixed(2)}초 뒤에 다시 사용해주세요.`,
            color: "DarkRed"
          })
        ] }).then(m => client.msgdelete(m, 0.75));
      } else {
        handler.cooldown.set(`${message.guildId!}.${message.author.id}`, Date.now()+1000*2);
        music(message, message.content.trim());
      }
      client.msgdelete(message, 400, true);
    }
  }
}