import type { PeerDTO } from "../../../server/peers";
import type RTCSignalingServer from "./signaling-server";
import type Stream from "./stream";

// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
export class Negotiation {
  pc: RTCPeerConnection;

  constructor(public signaling: RTCSignalingServer) {
    this.pc = new RTCPeerConnection();

    stunServers().then((servers) => {
      const urls = [
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ].concat(servers);

      console.log("initializing an RTC connection with stun servers", {
        servers: urls,
      });

      this.pc = new RTCPeerConnection({
        iceServers: [{ urls }],
        iceCandidatePoolSize: 10,
      });

      this.pc.oniceconnectionstatechange = () => {
        if (this.pc.iceConnectionState === "failed") {
          this.pc.restartIce();
        }
      };
    });
  }

  setRemoteStream(remoteStream: Stream) {
    // Handling incoming tracks
    this.pc.ontrack = ({ track, streams }) => {
      track.onunmute = () => {
        const remote = streams[0];
        console.log("received remote stream", {
          stream: remote,
          tracks: remote.getTracks(),
        });
        remoteStream.setStream(remote);
      };
    };
  }

  prepare(toPeer: PeerDTO) {
    // Handling the negotiationneeded event
    let makingOffer = false;

    this.pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true;
        await this.pc.setLocalDescription();
        const lp = this.pc.localDescription!;
        this.signaling.sendDescription(lp, toPeer);
      } catch (err) {
        console.error(err);
      } finally {
        makingOffer = false;
      }
    };

    // Handling incoming ICE candidates
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signaling.sendCandidate(candidate, toPeer);
      }
    };

    // Handling incoming messages on the signaling channel
    let ignoreOffer = false;

    this.signaling.ondescription(async (description, fromPeer, polite) => {
      try {
        const offerCollision =
          description.type === "offer" &&
          (makingOffer || this.pc.signalingState !== "stable");

        console.log("current receiving state", {
          makingOffer,
          descriptionType: description.type,
          signalingState: this.pc.signalingState,
          polite,
        });

        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) {
          console.log("ignoring offer");
          return;
        }

        await this.pc.setRemoteDescription(description);
        if (description.type === "offer") {
          await this.pc.setLocalDescription();
          this.signaling.sendDescription(this.pc.localDescription!, fromPeer);
        }
      } catch (err) {
        console.error(err);
      }
    });

    this.signaling.onicecandidate(async (candidate) => {
      try {
        try {
          await this.pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) {
            throw err;
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  onconnectionstate(listener: (connected: boolean) => void) {
    this.pc.oniceconnectionstatechange = () => {
      console.log("connection state", this.pc.iceConnectionState);
      const c = ["connected", "completed", "closed"].includes(
        this.pc.iceConnectionState
      );
      listener(c);
    };
  }

  end() {
    this.pc.close();
  }
}

// Courtesy of https://github.com/pradt2/always-online-stun?tab=readme-ov-file
async function stunServers() {
  const VALID_HOSTS =
    "https://raw.githubusercontent.com/pradt2/always-online-stun/master/valid_hosts.txt";

  const addrs = (await (await fetch(VALID_HOSTS)).text())
    .trim()
    .split("\n")
    .map((url) => `stun:${url}`);

  return addrs;
}
