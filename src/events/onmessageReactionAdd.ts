import "dotenv/config";
import { client } from '../index';
import { Guild, MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import shuffle from '../music/shuffle';
import MDB from "../database/Mongodb";
import { pause, skipPlayer, waitend } from "../music/play";

export default async function onmessageReactionAdd (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  let guildDB = await MDB.module.guild.findOne({ id: reaction.message.guildId });
  if (!guildDB) return console.log('reaction 데이터베이스 검색 실패');
  let musicDB = client.musicdb(reaction.message.guildId!);

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  const name = reaction.emoji.name;

  if (reaction.message.channelId === guildDB.channelId) {
    if (name === '⏯️') {
      if (musicDB.playing) pause(reaction.message.guild as Guild);
    }
    if (name === '⏹️') {
      await waitend(reaction.message);
    }
    if (name === '⏭️') {
      if (musicDB.playing) await skipPlayer(reaction.message);
    }
    if (name === '🔀') {
      if (musicDB.playing && musicDB.queuenumber.length > 0) {
        await shuffle(reaction.message);
      }
    }
    reaction.users.remove(user.id);
  }
}