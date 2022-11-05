import type RTCSignalingServer from "./signaling-server";

export default function manager(
  signaling: RTCSignalingServer,
  pc: RTCPeerConnection
) {
  async function call() {
    pc.onicecandidate = (event) => {
      console.log("on ice candidate", event);
      if (event.candidate === null) return;
      signaling.addOfferIceCandidates(event.candidate);
    };

    console.info("creating an offer");
    const sdpOffer = await pc.createOffer();
    await pc.setLocalDescription(sdpOffer);
    await signaling.call(sdpOffer);

    signaling.onAnswer((sdp) => pc.setRemoteDescription(sdp));

    signaling.onNewIceCandidate("answer", (aic) => pc.addIceCandidate(aic));
  }

  async function answer(offer: RTCSessionDescription) {
    pc.onicecandidate = (event) => {
      console.log("on ice candidate", event);
      if (event.candidate === null) return;
      signaling.addAnswerIceCandidates(event.candidate);
    };

    pc.setRemoteDescription(offer);

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
