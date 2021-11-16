import { msg } from '..';
import { Message } from 'discord.js';

export default async function onMessageCreate (message: Message) {
  msg.runCommand(message);
}