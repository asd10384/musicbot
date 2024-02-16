import { config } from "../config/config";
import { Logger } from "../utils/Logger";
import { MusicType } from "../@types/Music";
import SpotifyWebApi from "spotify-web-api-node";

export class SpotifyApi {
  private expires_in = 0;
  private spotify = new SpotifyWebApi({
    clientId: config.SPOTIFY_CLIENT_ID,
    clientSecret: config.SPOTIFY_CLIENT_SECRET,
  });
  private async checkTOKEN() {
    if (Date.now() <= this.expires_in) return true;
    const data = await this.spotify.clientCredentialsGrant().then((data) => {
      if (data.body?.access_token !== undefined && data.body?.expires_in !== undefined) return data.body;
      return null;
    }, (err) => {
      if (config.DEBUG) Logger.error(err.message);
      return null;
    }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (!data) return false;
    this.expires_in = Date.now() + data.expires_in*1000;
    this.spotify.setAccessToken(data.access_token);
    return true;
  }
  public async getVideo(id: string, userId: string): Promise<{ info?: MusicType; err?: string; }> {
    if (!await this.checkTOKEN()) return { err: "스포티파이 API불러오기 오류" };
    const data = await this.spotify.getTrack(id, { market: "KR" }).then(res => res.body || null).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (!data?.name) return { err: "스포티파이 노래를 찾을수 없습니다." };
    return { info: {
      type: "spotify",
      id: "",
      realId: data.id,
      title: data.name,
      author: data.artists[0].name,
      duration: Math.ceil(data.duration_ms/1000),
      image: data.album.images[data.album.images.length-1].url,
      player: userId
    } };
  }
  public async getPlayList(id: string, userId: string): Promise<{ videos?: MusicType[]; err?: string; }> {
    if (!await this.checkTOKEN()) return { err: "스포티파이 API불러오기 오류" };
    const list: any = await this.spotify.getPlaylistTracks(id, {
      market: "KR",
      limit: 1000000,
      offset: 1000000
  }).then(res => res.body || null).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (!list?.tracks?.items || list.tracks.items.length === 0) return { err: "스포티파이 플레이리스트를 찾을수 없습니다." };
    let videos: MusicType[] = [];
    for (let data of list.tracks.items as SpotifyApi.PlaylistTrackObject[]) {
      if (!data.track) continue;
      videos.push({
        type: "spotify",
        id: "",
        realId: data.track.id,
        title: data.track.name,
        author: data.track.artists[0].name,
        duration: Math.ceil(data.track.duration_ms/1000),
        image: data.track.album.images[data.track.album.images.length-1].url,
        player: userId
      });
    }
    if (videos.length === 0) return { err: "스포티파이 플레이리스트를 찾을수 없습니다." };
    return { videos: videos };
  }
  public async getRecommand(id: string): Promise<{ videos?: MusicType[]; err?: string; }> {
    if (!await this.checkTOKEN()) return { err: "스포티파이 API불러오기 오류" };
    const list = await this.spotify.getRecommendations({
      market: "KR",
      limit: 1000000,
      seed_tracks: id,
      min_popularity: undefined
    }).then(res => res.body || null).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (!list?.tracks || list.tracks.length === 0) return { err: "스포티파이 추천영상을 찾을수 없습니다" };
    return { videos: list.tracks.map((data) => {
      return {
        type: "spotify",
        id: "",
        realId: data.id,
        title: data.name,
        author: data.artists[0].name,
        duration: Math.ceil(data.duration_ms/1000),
        image: data.album.images[data.album.images.length-1].url,
        player: "자동재생"
      }
    }) };
  }
}