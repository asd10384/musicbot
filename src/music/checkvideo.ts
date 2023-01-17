import ytdl from "ytdl-core";
import { agent, YT_TOKEN } from "./musicClass";

const areaobj = {
  KR: "한국"
};

export const checkvideo = async (data: { url?: string, getInfo?: ytdl.videoInfo }): Promise<[ true, ytdl.videoInfo ] | [ false, string ]> => {
  if (data.url) {
    const info = await ytdl.getInfo(data.url, {
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
      if (info.videoDetails.availableCountries.includes('KR')) return [ true, info ];
      return [ false, `${areaobj.KR}에서 재생할수 없는 영상입니다.` ];
    }
    return [ false, `영상을 재생할수 없습니다.` ];
  } else if (data.getInfo) {
    if (data.getInfo.videoDetails) {
      // if (data.getInfo.videoDetails.isLiveContent || data.getInfo.videoDetails.lengthSeconds === "0") return [ false, `라이브는 재생할수 없습니다.` ];
      if (data.getInfo.videoDetails.availableCountries.includes('KR')) return [ true, data.getInfo ];
      return [ false, `${areaobj.KR}에서 재생할수 없는 영상입니다.` ];
    }
    return [ false, `영상을 재생할수 없습니다.` ];
  }
  return [ false, `영상을 찾을수 없습니다.` ];
}