
export default function checkurl(text: string) {
  const checkvideo = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  const checklist = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
  const checkbillboardoo = /^(?:https?:\/\/)wakmusic\.xyz\/player\/((\w|-){11})/;
  const checkbillboardoolist = /^(?:https?:\/\/)wakmusic\.xyz\/player\/((\w|-){11})\?prev=\&next=/;
  return {
    video: text.match(checkvideo),
    list: text.match(checklist),
    billboardoo: text.match(checkbillboardoo),
    billboardoolist: text.match(checkbillboardoolist)
  };
}