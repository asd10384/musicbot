import { AudioPlayer, PlayerSubscription } from "@discordjs/voice";
import { Prisma } from "@prisma/client";

export interface MusicType {
  type: "youtube" | "spotify";
  id: string;
  realId: string;
  title: string;
  author: string;
  duration: number;
  image: string;
  player: string;
}

export interface MDBType {
  playing: MusicType | null;
  queue: MusicType[];
  recommandList: MusicType[];
  subscription: PlayerSubscription | null;
  autoPause: boolean;
  channelId: string;
  msgId: string;
  options: Prisma.JsonObject;
  timer: NodeJS.Timeout | null;
}

export interface MDBInputType {
  playing?: MusicType | null;
  queue?: MusicType[];
  recommandList?: MusicType[];
  subscription?: PlayerSubscription | null;
  autoPause?: boolean;
  channelId?: string;
  msgId?: string;
  options?: Prisma.JsonObject;
  timer?: NodeJS.Timeout | null;
}

export interface DatabaseOptions {
  recommand: boolean;
}

export interface GetRecommand_DataType {
  queueContextParams: string;
  continuation: string;
  videoId: string;
  playlistSetVideoId: string;
  playerParams: string;
  params: string;
  index: number;
}

export interface ParmasType {
  shuffle?: boolean;
  first?: boolean;
}