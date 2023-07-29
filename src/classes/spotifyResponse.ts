import { LavalinkNode, TrackResponse } from "lavacord";
import { LavasfyClient } from "lavasfy";
export class getResponse extends require("lavacord").Rest {
  static async load(node: LavalinkNode, query: string, lsClient: LavasfyClient): Promise<TrackResponse> {
    const spotify = lsClient ? lsClient.nodes.get(node.id) : undefined;
    return spotify && lsClient?.isValidURL(query) ? await spotify.load(query) : await super.load(node, query);
  }
}