import type { Peer } from "./signaling-server";
import type RTCSignalingServer from "./signaling-server";

export async function createAndSendOffer(
  pc: RTCPeerConnection,
  signaling: RTCSignalingServer,
  peer: Peer
) {
  pc.onicecandidate = (event) => {
    console.log("on ice candidate", event);
    if (event.candidate === null) return;
    signaling.addOfferIceCandidates(event.candidate, peer);
  };

  console.info("creating an offer");
  const sdpOffer = await pc.createOffer();
  await pc.setLocalDescription(sdpOffer);
  await signaling.offer(sdpOffer, peer);
}

export async function createAndSendAnswer(
  pc: RTCPeerConnection,
  signaling: RTCSignalingServer,
  offer: RTCSessionDescription,
  to: Peer
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
