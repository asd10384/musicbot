import { Message } from "discord.js";

export const msgDelete = (message: Message, time: number, custom?: boolean): void => {
  let dtime = custom ? time : 6000 * time;
  if (dtime < 100) dtime = 100;
  setTimeout(async () => {
    if (message.deletable) await message.delete().catch(() => {});
  }, dtime);
}