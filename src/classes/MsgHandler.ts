import { Collection, Message, MessageEmbed } from 'discord.js';
import { readdirSync } from 'fs';
import { client } from '..';
import _ from '../consts';
import { MsgCommand as Command } from '../interfaces/Command';
import MDB from "../database/Mongodb";
import music from "../music/music";

export default class MsgHandler {
  public commands: Collection<string, Command>;

  constructor () {
    this.commands = new Collection();

    const commandPath = _.MSG_COMMANDS_PATH;
    const commandFiles = readdirSync(commandPath);

    for (const commandFile of commandFiles) {
      const command = new (require(_.MSG_COMMAND_PATH(commandFile)).default)() as Command;

      this.commands.set(command.metadata.name, command);
    }
  }

  public runCommand (message: Message) {
    if (message.author.bot || message.channel.type === 'DM') return;
    if (message.content.startsWith(client.prefix)) {
      const content = message.content.slice(client.prefix.length).trim();
      const args = content.split(/ +/g);
      const commandName = args.shift()?.toLowerCase();
      const command = this.commands.get(commandName!) || this.commands.find((cmd) => cmd.metadata.aliases.includes(commandName!));
      try {
        if (!command) return err(message, commandName);
        command.run(message, args);
      } catch(error) {
        if (client.debug) console.log(error); // 오류확인
        err(message, commandName);
      } finally {
        client.msgdelete(message, 0);
      }
    } else {
      MDB.get.guild(message).then((guildID) => {
        if (guildID!.channelId === message.channelId) {
          music(message, message.content.trim());
          client.msgdelete(message, 350, true);
        }
      });
    }
  }
}

function err(message: Message, commandName: string | undefined | null) {
  if (!commandName || commandName == '') return;
  let errembed = new MessageEmbed()
    .setColor('DARK_RED')
    .setDescription(`\` ${commandName} \` 이라는 명령어를 찾을수 없습니다.`)
    .setFooter(` ${client.prefix}help 를 입력해 명령어를 확인해주세요.`);
  return message.channel.send({
    embeds: [ errembed ]
  }).then(m => client.msgdelete(m, 1));
}