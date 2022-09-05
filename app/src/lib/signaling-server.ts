const SIGNALING_SERVER_ENPIONT = import.meta.env.VITE_SIGNALING_SERVER_ENPIONT;

export default class RTCSignalingServer {
  eventsSrc: EventSource;

  constructor(private callId: string) {
    this.eventsSrc = new EventSource(
      SIGNALING_SERVER_ENPIONT + "/events/" + callId
    );
  }

  async call(offer: RTCSessionDescriptionInit) {
    console.info("offer saved", offer);
    await fetch(SIGNALING_SERVER_ENPIONT + "/offer/" + this.callId, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(offer),
    });
  }

  async getOffer(): Promise<RTCSessionDescriptionInit> {
    return fetch(SIGNALING_SERVER_ENPIONT + "/offer/" + this.callId).then((r) =>
      r.json()
    );
  }

  async answer(sdpAnswer: RTCSessionDescriptionInit) {
    console.info("answer saved", sdpAnswer);
    await fetch(SIGNALING_SERVER_ENPIONT + `/answer/${this.callId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(sdpAnswer),
    });
  }

  async addOfferIceCandidates(ic: RTCIceCandidate) {
    console.info("offer ice candidates", ic.toJSON());
    return this.addIceCandidates(ic, "offer");
  }

  async addAnswerIceCandidates(ic: RTCIceCandidate) {
    console.info("answer ice candidates", ic.toJSON());
    return this.addIceCandidates(ic, "answer");
  }

  private async addIceCandidates(c: RTCIceCandidate, type: "offer" | "answer") {
    await fetch(
      SIGNALING_SERVER_ENPIONT + `/${type}/${this.callId}/candidate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(c),
      }
    );
  }

  onAnswer(listener: (a: RTCSessionDescription) => void) {
    this.eventsSrc.addEventListener("answer", ({ data }) => {
      const sdp = new RTCSessionDescription(JSON.parse(data));
      console.info("recieved answer", sdp);
      listener(sdp);
    });
  }

  onNewIceCandidate(
    type: "offer" | "answer",
    listener: (i: RTCIceCandidate) => void
  ) {
    this.eventsSrc.addEventListener(`${type}Candidate`, ({ data }) => {
      const ice = new RTCIceCandidate(JSON.parse(data));
      console.info("recieved", type, "ice candidate", ice);
      listener(ice);
    });
  }
}
