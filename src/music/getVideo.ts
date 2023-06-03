import "dotenv/config";
import ytdl from "ytdl-core";
import { HttpsProxyAgent } from "https-proxy-agent";

export const agent = new HttpsProxyAgent(process.env.PROXY!);
export const YT_TOKEN = process.env.YT_TOKEN && process.env.YT_TOKEN.length != 0 ? process.env.YT_TOKEN : undefined;

export interface Video {
  title: string;
  duration: string;
  id: string;
  image: string;
  author: string;
}

export const getVideo = async (data: { id?: string, getInfo?: ytdl.videoInfo }): Promise<{ videoData?: Video; err?: string; }> => {
  if (data.id) {
    const info = await ytdl.getInfo(data.id, {
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
    if (info && info.videoDetails) {
      // if (info.videoDetails.isLiveContent || info.videoDetails.lengthSeconds === "0") return [ false, `라이브는 재생할수 없습니다.` ];
      if (info.videoDetails.availableCountries.includes('KR')) return { videoData: {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        id: info.videoDetails.videoId,
        author: info.videoDetails.author?.name || "",
        image: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length-1].url || `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`
      } };
      return { err: `한국에서 재생할수 없는 영상입니다.` };
    }
    return { err: `영상을 재생할수 없습니다.` };
  }
  if (data.getInfo) {
    if (data.getInfo.videoDetails) {
      // if (data.getInfo.videoDetails.isLiveContent || data.getInfo.videoDetails.lengthSeconds === "0") return [ false, `라이브는 재생할수 없습니다.` ];
      if (data.getInfo.videoDetails.availableCountries.includes('KR')) return { videoData: {
        title: data.getInfo.videoDetails.title,
        duration: data.getInfo.videoDetails.lengthSeconds,
        id: data.getInfo.videoDetails.videoId,
        author: data.getInfo.videoDetails.author?.name || "",
        image: data.getInfo.videoDetails.thumbnails[data.getInfo.videoDetails.thumbnails.length-1].url || `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`
      } };
      return { err: `한국에서 재생할수 없는 영상입니다.` };
    }
    return { err: `영상을 재생할수 없습니다.` };
  }
  return { err: `영상을 찾을수 없습니다.` };
}