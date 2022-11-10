import cuid from "cuid";

export type Peer = { id: string; userName: string };

const SIGNALING_SERVER_ENPIONT = import.meta.env.VITE_SIGNALING_SERVER_ENPIONT;

const PEER_ID_HEADER = "X-Peer-ID";

export default class RTCSignalingServer {
  peerId = cuid();
  eventsSrc: EventSource;
  answerListener?: (e: MessageEvent) => void;
  offerListener?: (e: MessageEvent) => void;
  iceCandidateListener?: (e: MessageEvent) => void;
  peerConnectedListener?: (e: MessageEvent) => void;
  peerDisconnectedListener?: (e: MessageEvent) => void;

  constructor(userName: string) {
    this.eventsSrc = new EventSource(
      `${SIGNALING_SERVER_ENPIONT}/events?peerId=${this.peerId}&userName=${userName}`
    );
  }

  async offer(offer: RTCSessionDescriptionInit, to: Peer) {
    console.info("sending offer", offer);
    await this.post("/offer/" + to.id, offer);
  }

  async answer(offer: RTCSessionDescriptionInit, to: Peer) {
    console.info("sending answer", offer);
    await this.post("/answer/" + to.id, offer);
  }

  async addOfferIceCandidates(ic: RTCIceCandidate, to: Peer) {
    console.info("offer ice candidates", ic.toJSON());
    return this.addIceCandidates(ic, "offer", to);
  }

  async addAnswerIceCandidates(ic: RTCIceCandidate, to: Peer) {
    console.info("answer ice candidates", ic.toJSON());
    return this.addIceCandidates(ic, "answer", to);
  }

  private async addIceCandidates(
    c: RTCIceCandidate,
    type: "offer" | "answer",
    to: Peer
  ) {
    await this.post(`/${type}/${to.id}/candidate`, c);
  }

  onAnswer(listener: (a: RTCSessionDescription, to: Peer) => void) {
    if (this.answerListener) {
      this.eventsSrc.removeEventListener("answer", this.answerListener);
    }
    this.answerListener = ({ data }) => {
      const parsedData = JSON.parse(data);
      const sdp = new RTCSessionDescription(parsedData.payload);
      console.info("recieved answer", parsedData);
      listener(sdp, parsedData.fromPeer);
    };
    this.eventsSrc.addEventListener("answer", this.answerListener);
  }

  onOffer(listener: (a: RTCSessionDescription, to: Peer) => void) {
    if (this.offerListener) {
      this.eventsSrc.removeEventListener("offer", this.offerListener);
    }
    this.offerListener = ({ data }) => {
      const parsedData = JSON.parse(data);
      const sdp = new RTCSessionDescription(parsedData.payload);
      console.info("recieved offer", parsedData);
      listener(sdp, parsedData.fromPeer);
    };
    this.eventsSrc.addEventListener("offer", this.offerListener);
  }

  onNewIceCandidate(
    type: "offer" | "answer",
    listener: (i: RTCIceCandidate) => void
  ) {
    if (this.iceCandidateListener) {
      this.eventsSrc.removeEventListener(
        `${type}Candidate`,
        this.iceCandidateListener
      );
    }
    this.iceCandidateListener = ({ data }) => {
      const ice = new RTCIceCandidate(JSON.parse(data).payload);
      console.info("recieved", type, "ice candidate", ice);
      listener(ice);
    };
    this.eventsSrc.addEventListener(
      `${type}Candidate`,
      this.iceCandidateListener
    );
  }

  async peers(): Promise<{ data: Array<Peer> }> {
    const r = await fetch(SIGNALING_SERVER_ENPIONT + "/peers", {
      headers: {
        [PEER_ID_HEADER]: this.peerId,
      },
    });
    return await r.json();
  }

  onPeerConnected(listener: (peer: Peer) => void) {
    if (this.peerConnectedListener) {
      this.eventsSrc.removeEventListener(
        "peerConnected",
        this.peerConnectedListener
      );
    }

    this.peerConnectedListener = ({ data }) => {
      const parsedData = JSON.parse(data);
      console.info("peer connected", parsedData);
      listener(parsedData.fromPeer);
    };

    this.eventsSrc.addEventListener(
      "peerConnected",
      this.peerConnectedListener
    );
  }

  onPeerDisconnected(listener: (peer: Peer) => void) {
    if (this.peerDisconnectedListener) {
      this.eventsSrc.removeEventListener(
        "peerDisconnected",
        this.peerDisconnectedListener
      );
    }

    this.peerDisconnectedListener = ({ data }) => {
      const parsedData = JSON.parse(data);
      console.info("peer disconnected", parsedData);
      listener(parsedData.fromPeer);
    };

    this.eventsSrc.addEventListener(
      "peerDisconnected",
      this.peerDisconnectedListener
    );
  }

  private post(endpoint: string, data: any) {
    return fetch(SIGNALING_SERVER_ENPIONT + endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PEER_ID_HEADER]: this.peerId,
      },
      body: JSON.stringify(data),
    });
  }
}
