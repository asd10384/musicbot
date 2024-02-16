export const fshuffle = (list: any[]): any[] => {
  var i, j, x;
  for (i=list.length; i; i-=1) {
    j = Math.floor(Math.random()*i);
    x = list[i-1];
    list[i-1] = list[j];
    list[j] = x;
  }
  return list;
}