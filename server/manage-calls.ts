import { SDPAnswer, SDPOffer } from "./inputs";

type ICECandidate = Record<string, unknown>;

interface CallEvent {
  type: "offer" | "answer" | "offerCandidate" | "answerCandidate";
  data: SDPAnswer | ICECandidate;
}

export type CallEventListener = ((e: CallEvent) => void) & {
  id: string;
};

export class CallsManager {
  private offerMap = new Map<string, SDPOffer>();
  private answerMap = new Map<string, SDPAnswer>();

  private eventListeners = new Map<string, Set<CallEventListener>>();

  setOffer(callId: string, sdp: SDPOffer, clientId?: string) {
    this.offerMap.set(callId, sdp);
    console.log("pushing an offer", sdp, "for call", callId);
    this.eventListeners.get(callId)?.forEach((l) => {
      if (l.id === clientId) return null;
      l({
        type: "offer",
        data: sdp,
      });
    });
  }

  getOffer(callId: string) {
    return this.offerMap.get(callId);
  }

  setAnswer(callId: string, sdp: SDPAnswer, clientId?: string) {
    this.answerMap.set(callId, sdp);
    console.log("pushing an answer", sdp, "for call", callId);
    this.eventListeners.get(callId)?.forEach((l) => {
      if (l.id === clientId) return null;
      l({
        type: "answer",
        data: sdp,
      });
    });
  }

  getAnswer(callId: string) {
    return this.answerMap.get(callId);
  }

  setOfferCandidate(callId: string, c: ICECandidate, clientId?: string) {
    console.log("pushing an offer ice candidate", c);
    this.eventListeners.get(callId)?.forEach((l) => {
      if (l.id === clientId) return null;
      l({
        type: "offerCandidate",
        data: c,
      });
    });
  }

  setAnswerCandidate(callId: string, c: ICECandidate, clientId?: string) {
    console.log("pushing an answer ice candidate", c);
    this.eventListeners.get(callId)?.forEach((l) => {
      if (l.id === clientId) return null;
      l({
        type: "answerCandidate",
        data: c,
      });
    });
  }

  registerEventListener(callId: string, listener: CallEventListener) {
    let listeners = this.eventListeners.get(callId);
    if (!listeners) {
      listeners = new Set();
    }
    listeners.add(listener);
    this.eventListeners.set(callId, listeners);

    return () => {
      listeners?.delete(listener);
    };
  }
}
