import { QDB } from "../databases/Quickdb";
import { Message, MessageReaction, PartialMessage, PartialMessageReaction, PartialUser, TextChannel, User } from "discord.js";
import { client } from "..";

export const checkChannel = async (message: Message | PartialMessage, user: User | PartialUser) => {
  const bot = await message.guild?.members.fetchMe({ cache: true });
  const member = message.guild?.members.cache.get(user.id);
  if (member?.voice?.channelId && bot?.voice?.channelId && member?.voice?.channelId === bot?.voice?.channelId) return true;
  (message.channel as TextChannel).send({ embeds: [
    client.mkembed({
      title: '음성채널을 찾을수 없습니다.',
      description: '음성채널에 들어가서 사용해주세요.',
      footer: { text: `${member?.nickname || user.username}님에게 보내는 메세지` },
      color: "DarkRed"
    })
  ] }).then(m => client.msgdelete(m, 1));
  return false;
}

export const onmessageReactionAdd = async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  let GDB = await QDB.guild.get(reaction.message.guild!);
  const mc = client.getmc(reaction.message.guild!);

  const name = reaction.emoji.name;

  if (reaction.message.channelId === GDB.channelId) {
    if (name === '⏯️') {
      if (mc.playing && await checkChannel(reaction.message, user)) mc.pause();
    }
    if (name === '⏹️') {
      mc.stop({});
    }
    if (name === '⏭️') {
      if (mc.playing && await checkChannel(reaction.message, user)) await mc.skipPlayer();
    }
    if (name === '🔀') {
      if (mc.playing && await checkChannel(reaction.message, user) && mc.queue.length > 0) {
        mc.shuffle();
      }
    }
    if (name === 'auto') {
      await QDB.guild.set(reaction.message.guild!, { options: {
        ...GDB.options,
        recommend: !GDB.options.recommend
      } });
      mc.setMsg({});
    }
    reaction.users.remove(user.id);
  }
}