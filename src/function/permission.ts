import { client } from "..";
import MDB from "../database/Mongodb";
import { I, M } from "../aliases/discord.js";
import { GuildMemberRoleManager, MessageEmbed, Permissions } from "discord.js";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 */

export async function check_permission(msg: I | M): Promise<boolean> {
  let userper = msg.member?.permissions;
  if (permissonstype(userper)) if (userper.has('ADMINISTRATOR')) return true;
  let guildDB = await MDB.get.guild(msg);
  let guildrole = guildDB!.role;
  let userrole = msg.member?.roles;
  if (rolestype(userrole)) if (userrole.cache.some((role) => guildrole.includes(role.id))) return true;
  return false;
}

export const embed_permission: MessageEmbed = client.mkembed({
  description: `이 명령어를 사용할\n권한이 없습니다.`,
  color: 'DARK_RED'
});

function permissonstype(permisson: string | Permissions | undefined): permisson is Permissions {
  return (<Permissions>permisson) !== undefined;
}
function rolestype(roles: GuildMemberRoleManager | string[] | undefined): roles is GuildMemberRoleManager {
  return (<GuildMemberRoleManager>roles) !== undefined;
}