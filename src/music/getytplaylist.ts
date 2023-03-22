import axios from "axios";

import { key, contentClientVersion, Adata } from "./data";
import { nowplay } from "./musicClass";

const { authorization, cookie } = Adata;

export const getPlayList = (playlistId: string, authorId: string) => new Promise<{
  name?: string;
  list?: nowplay[];
  err?: string;
}>((res) => {
  if (!playlistId.startsWith("VL")) playlistId = "VL" + playlistId;
  axios.post(`https://music.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`, {
    "browseId": playlistId,
    "context": {
      "client": {
        "hl": "ko",
        "gl": "KR",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36,gzip(gfe)",
        "clientName": "WEB_REMIX",
        "clientVersion": `${contentClientVersion}`,
        "clientFormFactor": "UNKNOWN_FORM_FACTOR",
        "timeZone": "Asia/Seoul",
        "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT"
      }
    }
  }, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
      "authorization": `${authorization}`,
      "origin": "https://music.youtube.com",
      "referer": `https://music.youtube.com/search?q=${playlistId}`,
      "cookie": `${cookie}`,
      'Accept-Encoding': '*'
    },
    responseType: "json"
  }).then((res2) => {
    try {
      if (res2.data?.header?.musicDetailHeaderRenderer?.title?.runs?.length < 1) return res({ err: "플레이리스트를 찾을수없음1" });
      let name: string | undefined = res2.data?.header?.musicDetailHeaderRenderer?.title?.runs[0]?.text;
      let d1 = res2.data?.contents?.singleColumnBrowseResultsRenderer?.tabs;
      let d2 = d1[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
      let d3: any[] = d2[0]?.musicPlaylistShelfRenderer?.contents;
      if (!d3) return res({ name: name, err: "플레이리스트를 찾을수없음2" });
      let d4: nowplay[] = [];
      for (let d of d3) {
        if (!d.musicResponsiveListItemRenderer?.playlistItemData?.videoId) continue;
        if (d.musicResponsiveListItemRenderer?.flexColumns?.length < 2) continue;
        if (d.musicResponsiveListItemRenderer?.fixedColumns?.length < 1) continue;
        if (d.musicResponsiveListItemRenderer?.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.length < 1) continue;
        if (d.musicResponsiveListItemRenderer?.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.length < 1) continue;
        if (d.musicResponsiveListItemRenderer?.fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.length < 1) continue;
        let title: string | undefined = d.musicResponsiveListItemRenderer?.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text;
        let thumbnaillist: any[] | undefined = d.musicResponsiveListItemRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
        let durations: string[] | undefined = d.musicResponsiveListItemRenderer?.fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs[0]?.text?.split(":");
        let author: string | undefined = d.musicResponsiveListItemRenderer?.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text;
        let url = d.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
        if (!title || !durations || !author) continue;
        d4.push({
          title: title,
          duration: (Number(durations[0]) * 60 + Number(durations[1])).toString(),
          author: author,
          url: url,
          image: (thumbnaillist && thumbnaillist?.length > 0 && thumbnaillist[thumbnaillist.length-1]?.url) ? thumbnaillist[thumbnaillist.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
          player: `<@${authorId}>`
        });
      }
      if (d4 && d4.length > 0) return res({ name: name, list: d4 });
      return res({ name: name, err: "플레이리스트를 찾을수없음3" });
    } catch {
      return res({ err: "플레이리스트를 찾을수없음4" });
    }
  }).catch(() => {
    return res({ err: "플레이리스트를 찾을수없음5" });
  });
});
