import type RTCSignalingServer from "./signaling-server";

export default function manager(
  signaling: RTCSignalingServer,
  pc: RTCPeerConnection
) {
  async function createAndSendOffer() {
    pc.onicecandidate = (event) => {
      console.log("on ice candidate", event);
      if (event.candidate === null) return;
      signaling.addOfferIceCandidates(event.candidate);
    };

    console.info("creating an offer");
    const sdpOffer = await pc.createOffer();
    await pc.setLocalDescription(sdpOffer);
    await signaling.offer(sdpOffer);
  }

  async function createAndSendAnswer(offer: RTCSessionDescription) {
    pc.onicecandidate = (event) => {
      console.log("on ice candidate", event);
      if (event.candidate === null) return;
      signaling.addAnswerIceCandidates(event.candidate);
    };

    await pc.setRemoteDescription(offer);

    console.info("creating an answer");
    const sdpAnswer = await pc.createAnswer();
    await pc.setLocalDescription(sdpAnswer);

    await signaling.answer(sdpAnswer);
  }

  signaling.onAnswer((sdp) => pc.setRemoteDescription(sdp));
  signaling.onOffer(async (sdp) => {
    await createAndSendAnswer(sdp);
  });

  signaling.onNewIceCandidate("answer", (aic) => pc.addIceCandidate(aic));
  signaling.onNewIceCandidate("offer", (oic) => pc.addIceCandidate(oic));

  pc.onnegotiationneeded = async (event) => {
    console.log("let's parler", event);
    await createAndSendOffer();
  };

  return {
    offer: createAndSendOffer,
    answer: createAndSendAnswer,
  };
}
