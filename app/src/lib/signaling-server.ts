const SIGNALING_SERVER_ENPIONT = import.meta.env.VITE_SIGNALING_SERVER_ENPIONT;

export default class RTCSignalingServer {
  eventsSrc: EventSource;
  answerListener?: (e: MessageEvent) => void;
  iceCandidateListener?: (e: MessageEvent) => void;

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

  async getOffer(): Promise<RTCSessionDescription> {
    const sdp: RTCSessionDescriptionInit = await fetch(
      SIGNALING_SERVER_ENPIONT + "/offer/" + this.callId
    ).then((r) => {
      if (r.ok) {
        return r.json();
      }
      throw new Error("No offer found");
    });

    return new RTCSessionDescription(sdp);
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
    if (this.answerListener) {
      this.eventsSrc.removeEventListener("answer", this.answerListener);
    }
    this.answerListener = ({ data }) => {
      const sdp = new RTCSessionDescription(JSON.parse(data));
      console.info("recieved answer", sdp);
      listener(sdp);
    };
    this.eventsSrc.addEventListener("answer", this.answerListener);
  }

  onNewIceCandidate(
    type: "offer" | "answer",
    listener: (i: RTCIceCandidate) => void
  ) {
    if (this.iceCandidateListener) {
      this.eventsSrc.removeEventListener(
        `${type}Candidate`,
        this.iceCandidateListener
      );
    }
    this.iceCandidateListener = ({ data }) => {
      const ice = new RTCIceCandidate(JSON.parse(data));
      console.info("recieved", type, "ice candidate", ice);
      listener(ice);
    };
    this.eventsSrc.addEventListener(
      `${type}Candidate`,
      this.iceCandidateListener
    );
  }
}
