import "dotenv/config";
import ytdl from "ytdl-core";
import { HttpsProxyAgent } from "https-proxy-agent";

export const agent = new HttpsProxyAgent(process.env.PROXY!);
export const YT_TOKEN = process.env.YT_TOKEN && process.env.YT_TOKEN.length != 0 ? process.env.YT_TOKEN : undefined;

export const getThumbnail = async (id: string, defImage: string): Promise<string> => {
  const info = await ytdl.getInfo(id, {
    lang: "KR",
    requestOptions: {
      agent,
      headers: {
        "cookie": `${YT_TOKEN}`
      }
    }
  }).catch(() => {
    return undefined;
  });
  if (info && info.videoDetails) return info.videoDetails.thumbnails[info.videoDetails.thumbnails.length-1].url || defImage;
  return defImage;
}