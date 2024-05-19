import { ServerMessage, type PeerDTO } from "./schema";

const SIGNALING_SERVER_ENPIONT = import.meta.env.VITE_SIGNALING_SERVER_ENPIONT;

type Peer = PeerDTO;

const PEER_ID_HEADER = "X-Peer-ID";

export default class RTCSignalingServer {
  localPeerId = "";
  localIsPolite = false;

  private ws: WebSocket;

  private descriptionListener?: (
    e: RTCSessionDescriptionInit,
    from: PeerDTO
  ) => void;
  private iceCandidateListener?: (e: RTCIceCandidate) => void;
  private peerConnectedListener?: (p: PeerDTO) => void;
  private peerDisconnectedListener?: (p: PeerDTO) => void;

  constructor(userName: string) {
    const url = new URL(SIGNALING_SERVER_ENPIONT + "/ws");
    url.protocol = import.meta.env.PROD ? "wss" : "ws";
    this.ws = new WebSocket(url);

    this.ws.onerror = (e) => {
      console.error("[RTCSignalingServer] error in ws", e);
    };

    this.ws.onopen = () => {
      this.ws.send(
        JSON.stringify({
          type: "introduction",
          userName,
        })
      );
    };

    this.ws.onmessage = (m) => {
      console.log("ws message", m.data);
      const message = ServerMessage.parse(JSON.parse(m.data));

      switch (message.type) {
        case "introduction":
          this.localPeerId = message.id;
          break;
        case "description":
          this.descriptionListener?.(message.data, message.fromPeer);
          break;
        case "candidate":
          this.iceCandidateListener?.(message.data as any);
          break;
        case "peer-connected":
          this.peerConnectedListener?.(message.fromPeer);
          break;
        case "peer-disconnected":
          this.peerDisconnectedListener?.(message.fromPeer);
          break;

        default:
          console.warn("unhandled message type");
          break;
      }
    };
  }

  async sendDescription(data: RTCSessionDescription, to: Peer) {
    console.info("sending description", data);
    this.ws.send(
      JSON.stringify({
        type: "description",
        data,
        sendTo: to.id,
      })
    );
  }

  async sendCandidate(data: RTCIceCandidate, to: Peer) {
    console.info("sending candidate", data);
    this.ws.send(
      JSON.stringify({
        type: "candidate",
        data,
        sendTo: to.id,
      })
    );
  }

  ondescription(
    listener: (desc: RTCSessionDescription, from: Peer) => Promise<void> | void
  ) {
    this.descriptionListener = (desc, from: Peer) => {
      const sdp = new RTCSessionDescription(desc);
      console.info("recieved description", desc);
      return listener(sdp, from);
    };
  }

  onicecandidate(listener: (a: RTCIceCandidate) => void) {
    this.iceCandidateListener = (icecand) => {
      const ice = new RTCIceCandidate(icecand);
      console.info("recieved ice candidate", ice);
      return listener(ice);
    };
  }

  async peers(): Promise<{ data: Array<Peer> }> {
    if (!this.localPeerId)
      return {
        data: [],
      };

    const r = await fetch(SIGNALING_SERVER_ENPIONT + "/peers", {
      headers: {
        [PEER_ID_HEADER]: this.localPeerId,
      },
    });
    return await r.json();
  }

  onPeerConnected(listener: (peer: Peer) => void) {
    this.peerConnectedListener = (fromPeer) => {
      console.info("peer connected", fromPeer);
      listener(fromPeer);
    };
  }

  onPeerDisconnected(listener: (peer: Peer) => void) {
    this.peerDisconnectedListener = (fromPeer) => {
      console.info("peer disconnected", fromPeer);
      listener(fromPeer);
    };
  }
}
