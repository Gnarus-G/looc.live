import type RTCSignalingServer from "./signaling-server";

export default function manager(
  signaling: RTCSignalingServer,
  pc: RTCPeerConnection
) {
  async function call() {
    // save my ice candidates
    pc.onicecandidate = (event) => {
      console.info("offer candidates", event.candidate);
      if (!event.candidate) return;
      signaling.addOfferIceCandidates(event.candidate);
    };

    // create an offer
    const sdpOffer = await pc.createOffer();
    console.info("creating an offer");
    await pc.setLocalDescription(sdpOffer);
    await signaling.call(sdpOffer);

    // listen for answer
    signaling.onAnswer((sdp) => pc.setRemoteDescription(sdp));

    // add ice candiates for who answered
    signaling.onNewIceCandidate("answer", (aic) => pc.addIceCandidate(aic));
  }

  async function answer() {
    // save my answer ice candidates
    pc.onicecandidate = (event) => {
      console.info("offer candidates", event.candidate);
      if (!event.candidate) return;
      signaling.addAnswerIceCandidates(event.candidate);
    };

    const offer = await signaling.getOffer();
    pc.setRemoteDescription(new RTCSessionDescription(offer));

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
