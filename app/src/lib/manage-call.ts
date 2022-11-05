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

    pc.onnegotiationneeded = async (event) => {
      console.log("let's parler", event);

      await pc.setLocalDescription();
      if (pc.localDescription !== null) {
        await signaling.call(pc.localDescription);
      }
    };
  }

  async function createAndSendAnswer(offer: RTCSessionDescription) {
    await pc.setRemoteDescription(offer);

    console.info("creating an answer");
    const sdpAnswer = await pc.createAnswer();
    await pc.setLocalDescription(sdpAnswer);
    await signaling.answer(sdpAnswer);
  }

  async function answer(offer: RTCSessionDescription) {
    pc.onicecandidate = (event) => {
      console.log("on ice candidate", event);
      if (event.candidate === null) return;
      signaling.addAnswerIceCandidates(event.candidate);
    };

    await createAndSendAnswer(offer);

    // for when renegotiations happen
    signaling.onOffer(async (sdp) => {
      await createAndSendAnswer(sdp);
    });

    signaling.onNewIceCandidate("offer", (oic) => pc.addIceCandidate(oic));
  }

  return {
    call,
    answer,
  };
}
