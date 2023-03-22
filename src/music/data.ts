import "dotenv/config";

export const key = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
export const contentClientVersion = process.env.YOUTUBE_CONTENTCLIENTVERSION;

export const Adata = {
  authorization: process.env.A_YOUTUBE_MUSIC_AUTHORIZATION,
  cookie: process.env.A_YOUTUBE_MUSIC_COOKIE
}

export const Bdata = {
  authorization: process.env.B_YOUTUBE_MUSIC_AUTHORIZATION,
  cookie: process.env.B_YOUTUBE_MUSIC_COOKIE
}
