interface Peer {
  id: string;
  userName: string;
  notify<T>(notification: PeerNotification<T>): void;
}

interface PeerNotification<T> {
  type:
    | "offer"
    | "answer"
    | "offerCandidate"
    | "answerCandidate"
    | "peerConnected"
    | "peerDisconnected";
  data: {
    fromPeerId: Peer["id"];
    payload: T;
  };
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

  notifyAll<T>(note: PeerNotification<T>) {
    this.peerMap.forEach((p) => {
      p.notify(note);
    });
  }

  toArray() {
    return Array.from(this.peerMap.values());
  }
}
