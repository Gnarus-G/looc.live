import { SDPAnswer, SDPOffer } from "./inputs";

type ICECandidate = Record<string, unknown>;

interface PeerNotification {
  type: "offer" | "answer" | "offerCandidate" | "answerCandidate";
  data: {
    fromPeerId: Peer["id"];
    payload: SDPAnswer | SDPOffer | ICECandidate;
  };
}

interface Peer {
  id: string;
  userName: string;
  notify(notification: PeerNotification): void;
}

export default class Peers {
  peerMap = new Map<Peer["id"], Peer>();

  add(peer: Peer) {
    this.peerMap.set(peer.id, peer);
    return () => {
      this.peerMap.delete(peer.id);
    };
  }

  get(peerId: string) {
    return this.peerMap.get(peerId);
  }

  toArray() {
    return Array.from(this.peerMap.values());
  }
}
