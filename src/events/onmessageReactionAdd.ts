import { client } from '..';
import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import shuffle from '../music/shuffle';
import MDB from "../database/Mongodb";
import { pause, stopPlayer } from "../music/play";
import stop from "../music/stop";

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
      if (musicDB.playing) pause(reaction.message);
    }
    if (name === '⏹️') {
      await stop(reaction.message);
    }
    if (name === '⏭️') {
      if (musicDB.playing) stopPlayer(reaction.message.guildId!);
    }
    if (name === '🔀') {
      if (musicDB.playing && musicDB.queue.length > 0) {
        await shuffle(reaction.message);
      }
    }
    reaction.users.remove(user.id);
  }
}