const SIGNALING_SERVER_ENPIONT = "http://localhost:8080";

export default class RTCSignalingServer {
  eventsSrc: EventSource;

  constructor(private callId: string, private _pc: RTCPeerConnection) {
    this.eventsSrc = new EventSource(
      SIGNALING_SERVER_ENPIONT + "/events/" + callId
    );
  }

  async offer(offer: RTCSessionDescriptionInit) {
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

  async addIceCandidates(c: RTCIceCandidate, type: "offer" | "answer") {
    console.info("ice candidates for me", c.toJSON());
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
    this.eventsSrc?.addEventListener("answer", ({ data }) => {
      const sdp = new RTCSessionDescription(JSON.parse(data));
      console.info("recieved answer", sdp);
      listener(sdp);
    });
  }

  onNewIceCandidate(
    type: "offer" | "answer",
    listener: (i: RTCIceCandidate) => void
  ) {
    this.eventsSrc?.addEventListener(`${type}Candidate`, ({ data }) => {
      const ice = new RTCIceCandidate(JSON.parse(data));
      console.info("recieved ice candidate", type, ice);
      listener(ice);
    });
  }
}
