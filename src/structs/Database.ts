import { PrismaClient, Prisma, Guild as GuildType, User as UserType } from "@prisma/client";
import { Logger } from "../utils/Logger";
import { config } from "../config/config";

export class DataBaseClass {
  private prisma = new PrismaClient();
  constructor() {
    this.prisma.$connect().then(() => {
      Logger.ready(`Database Ready!`);
    });
  }
  public guild = new Guild(this.prisma);
  public user = new User(this.prisma);
}

class Guild {
  public constructor(private readonly prisma: PrismaClient) {}
  public async all() {
    return await this.prisma.guild.findMany({ where: {} }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return [] as GuildType[];
    });
  }
  public async get(guildId: string) {
    return await this.prisma.guild.findUnique({ where: { guildId: guildId } }).then(async (val) => {
      if (val) return val;
      return await this.prisma.guild.create({ data: {
        guildId: guildId,
        options: {
          recommand: false
        }
      } }).catch((err) => {
        if (config.DEBUG) Logger.error(err);
        return null;
      });
    }).catch(async (err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
  }
  public async set(guildId: string, data: Prisma.GuildCreateInput) {
    if (!(await this.get(guildId))) return await this.prisma.guild.create({ data: {
      guildId: guildId,
      ...data,
    } }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    return await this.prisma.guild.update({ where: { guildId: guildId }, data: data }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
  }
}

class User {
  public constructor(private readonly prisma: PrismaClient) {}
  public async all() {
    return await this.prisma.user.findMany({ where: {} }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return [] as UserType[];
    });
  }
  public async get(userId: string) {
    return await this.prisma.user.findUnique({ where: { userId: userId } }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
  }
  public async set(userId: string, data: Prisma.UserCreateInput) {
    if (!(await this.get(userId))) return await this.prisma.user.create({ data: data }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    return await this.prisma.user.update({ where: { userId: userId }, data: data }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
  }
}
