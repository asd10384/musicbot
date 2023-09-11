import axios from "axios";
import { nowplay } from "./musicClass";
import { LavasfyClient } from "lavasfy";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";

export const getSpotifyRecommand = (spotifyClient: LavasfyClient | null, vid: string): Promise<{ videoList?: nowplay[]; err?: string; }> => new Promise(async (res) => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return res({ err: SPOTIFY_CLIENT_ID ? "아이디를 찾을수없음1" : "시크릿을 찾을수없음1" });
  if (!spotifyClient) return res({ err: "client를 찾을수없음1" });
  if (!spotifyClient.token && !(await spotifyClient.requestToken().then(() => true).catch(() => false))) return res({ err: "토큰을 찾을수없음1" });

  let { list, err }: { list?: nowplay[]; err?: string; } = await axios.get(`https://api.spotify.com/v1/recommendations?${new URLSearchParams({
    limit: "100",
    market: "KR",
    seed_tracks: vid.replace("spotify-","")
  })}`, {
    headers: {
      'Content-Type': "application/x-www-form-urlencoded",
      'Accept-Encoding': '*',
      'Authorization': spotifyClient.token
    }
  }).then((val) => {
    if (!val.data.tracks) return { err: "추천영상을 찾을수없음1" };
    return { list: val.data.tracks.map((v: any) => {
      return {
        id: v.id,
        title: v.name,
        author: v.artists.map((v: any) => v.name).join(", "),
        duration: ((v.duration_ms || 0) / 1000).toFixed(0),
        image: v.album.images ? v.album.images[0].url : "",
        player: "자동재생"
      }
    }) };
  }).catch((err) => {
    return { err: "getRecommendation 오류: " + err.response.data.error.status || "000" + " " + err.response.data.error.message || "오류" };
  });
  if (!list || err) return res({ err: err || "추천영상을 찾을수없음2" });
  return res({ videoList: list });
});