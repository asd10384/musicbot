import MDB from "../database/Mongodb";

export default async function shuffle(guildId: string) {
  MDB.module.guild.findOne({ id: guildId }).then(async (guildDB) => {
    if (guildDB) {
      guildDB.queue = await fshuffle(guildDB.queue);
      await guildDB.save();
    }
  });
}

async function fshuffle(list: any[]) {
  var j, x, i;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random() * i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}