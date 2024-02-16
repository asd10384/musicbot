import { Bot } from "../index";
import { GuildMember } from "discord.js"
import { config } from "../config/config"

export const checkPermission = async (member: GuildMember): Promise<boolean> => {
  if (config.permissions.includes(member.user.id)) return true;
  if (member.permissions.has("Administrator")) return true;
  const gdb = await Bot.db.guild.get(member.guild.id);
  if (!gdb || gdb.roles.length === 0) return false;
  const memberRoles = Array.from(member.roles.cache.values()).map(r => r.id);
  let check = false;
  for (let roleId of gdb.roles.replace(/ +/g,'').split(',')) {
    if (memberRoles.includes(roleId)) {
      check = true;
      break;
    }
  }
  return check;
}