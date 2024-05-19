import { ServerMessage, type PeerDTO } from "./schema";

const SIGNALING_SERVER_ENPIONT = import.meta.env.VITE_SIGNALING_SERVER_ENPIONT;

type Peer = PeerDTO;

const PEER_ID_HEADER = "X-Peer-ID";

export default class RTCSignalingServer {
  localPeerId: string | null = null;
  localIsPolite = false;

  private ws: WebSocket;

  private callReceivedListener?: (caller: PeerDTO) => void;
  private descriptionListener?: (
    e: RTCSessionDescriptionInit,
    from: PeerDTO,
    localPeerPolite: boolean
  ) => void;
  private iceCandidateListener?: (e: RTCIceCandidate) => void;
  private localPeerUpdated?: (p: PeerDTO) => void;
  private peerConnectedListener?: (p: PeerDTO) => void;
  private peerDisconnectedListener?: (p: PeerDTO) => void;

  constructor(public localUserName: string) {
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
          userName: localUserName,
        })
      );
    };

    this.ws.onmessage = (m) => {
      console.log("ws message", m.data);
      const message = ServerMessage.parse(JSON.parse(m.data));

      switch (message.type) {
        case "assign-id":
          console.log("received local peer id", message);
          this.localPeerId = message.id;
          break;
        case "update-self":
          console.log("received local peer data for update", message);
          this.localPeerId = message.data.id;
          this.localUserName = message.data.id;
          this.localIsPolite = message.data.polite;
          this.localPeerUpdated?.(message.data);
          break;
        case "call":
          this.callReceivedListener?.(message.caller);
          break;
        case "description":
          this.descriptionListener?.(
            message.data,
            message.fromPeer,
            !message.fromPeer.polite
          );
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

  call(to: Peer) {
    console.info("sending a call", { to });
    this.ws.send(
      JSON.stringify({
        type: "call",
        callee: to,
      })
    );
  }

  sendDescription(data: RTCSessionDescription, to: Peer) {
    console.info("sending description", data);
    this.ws.send(
      JSON.stringify({
        type: "description",
        data,
        sendTo: to.id,
      })
    );
  }

  sendCandidate(data: RTCIceCandidate, to: Peer) {
    console.info("sending candidate", data);
    this.ws.send(
      JSON.stringify({
        type: "candidate",
        data,
        sendTo: to.id,
      })
    );
  }

  oncall(listener: (caller: PeerDTO) => void) {
    this.callReceivedListener = (caller) => {
      console.log("receiving call from", caller);
      return listener(caller);
    };
  }

  ondescription(
    listener: (
      desc: RTCSessionDescription,
      from: Peer,
      polite: boolean
    ) => Promise<void> | void
  ) {
    this.descriptionListener = (desc, from, polite) => {
      const sdp = new RTCSessionDescription(desc);
      console.info(
        "recieved description",
        desc,
        "with local peer as polite",
        polite
      );
      return listener(sdp, from, polite);
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
    if (!this.localPeerId) {
      return new Promise((res, rej) => {
        setTimeout(() => {
          const peers = this.peers().catch(rej);
          res(peers as any);
        }, 0);
      });
    }

    console.log("fetching peers list");

    const r = await fetch(SIGNALING_SERVER_ENPIONT + "/peers", {
      headers: {
        [PEER_ID_HEADER]: this.localPeerId!,
      },
    });
    return await r.json();
  }

  onLocalPeerUpdated(listener: (peer: Peer) => void) {
    this.localPeerUpdated = (peer) => {
      console.info("local peer updated up", peer);
      listener(peer);
    };
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
