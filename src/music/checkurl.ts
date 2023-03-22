
export const checkurl = (text: string) => {
  const checkvideo = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  const checklist = /^(?:https?:\/\/)?(?:m\.|www\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:playlist\?list=))((\w|-).+)(?:\S+)?$/;
  return {
    video: text.match(checkvideo),
    list: text.match(checklist)
  };
}