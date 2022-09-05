import type RTCSignalingServer from "./signaling-server";

export default function manager(
  signaling: RTCSignalingServer,
  pc: RTCPeerConnection
) {
  async function call() {
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      signaling.addOfferIceCandidates(event.candidate);
    };

    console.info("creating an offer");
    const sdpOffer = await pc.createOffer();
    await pc.setLocalDescription(sdpOffer);
    await signaling.call(sdpOffer);

    signaling.onAnswer((sdp) => pc.setRemoteDescription(sdp));

    signaling.onNewIceCandidate("answer", (aic) => pc.addIceCandidate(aic));
  }

  async function answer() {
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      signaling.addAnswerIceCandidates(event.candidate);
    };

    pc.setRemoteDescription(await signaling.getOffer());

    console.info("creating an answer");
    const sdpAnswer = await pc.createAnswer();
    await pc.setLocalDescription(sdpAnswer);

    await signaling.answer(sdpAnswer);

    signaling.onNewIceCandidate("offer", (oic) => pc.addIceCandidate(oic));
  }

  return {
    call,
    answer,
  };
}
