import type { PeerID } from "./signaling-server";
import type RTCSignalingServer from "./signaling-server";

export async function createAndSendOffer(
  pc: RTCPeerConnection,
  signaling: RTCSignalingServer,
  peerId: PeerID
) {
  pc.onicecandidate = (event) => {
    console.log("on ice candidate", event);
    if (event.candidate === null) return;
    signaling.addOfferIceCandidates(event.candidate, peerId);
  };

  console.info("creating an offer");
  const sdpOffer = await pc.createOffer();
  await pc.setLocalDescription(sdpOffer);
  await signaling.offer(sdpOffer, peerId);
}

export async function createAndSendAnswer(
  pc: RTCPeerConnection,
  signaling: RTCSignalingServer,
  offer: RTCSessionDescription,
  to: PeerID
) {
  pc.onicecandidate = (event) => {
    console.log("on ice candidate", event);
    if (event.candidate === null) return;
    signaling.addAnswerIceCandidates(event.candidate, to);
  };

  await pc.setRemoteDescription(offer);

  console.info("creating an answer");
  const sdpAnswer = await pc.createAnswer();
  await pc.setLocalDescription(sdpAnswer);

  await signaling.answer(sdpAnswer, to);
}
