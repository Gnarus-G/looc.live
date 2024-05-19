import { WebSocket } from "ws";
import { ServerMessageDTO } from "./schema";

export type PeerDTO = {
  id: string;
  userName: string;
  polite: boolean;
};

export interface Peer extends PeerDTO {
  notify(notification: PeerNotification): void;
  toJSON(): object;
}

type PeerNotification = ServerMessageDTO;

export default class Peers {
  peerMap = new Map<Peer["id"], Peer>();

  add(peer: Peer) {
    this.peerMap.set(peer.id, peer);
    console.log("peers", this);
    return () => {
      console.log("removing peer", peer.userName, "id", peer.id);
      this.peerMap.delete(peer.id);
    };
  }

  get(peerId: string) {
    const peer = this.peerMap.get(peerId);
    if (!peer) {
      throw new Error("No such peer by id");
    }
    return peer;
  }

  notifyAll(note: PeerNotification) {
    this.peerMap.forEach((p) => {
      p.notify(note);
    });
  }

  toArray() {
    return Array.from(this.peerMap.values());
  }
}

/* let p = 1; */

export class WebSocketPeer implements Peer {
  polite: boolean = false;
  userName: string = "<anonymous>";

  constructor(public id: string, private socket: WebSocket) {}

  notify(notification: PeerNotification) {
    this.socket.send(JSON.stringify(notification));
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  toJSON(): PeerDTO {
    return {
      id: this.id,
      userName: this.userName,
      polite: this.polite,
    };
  }
}
