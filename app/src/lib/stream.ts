export default class Stream {
  video?: HTMLVideoElement;
  constructor(public mediaStream: MediaStream = new MediaStream()) { }

  attach(element: HTMLVideoElement) {
    this.video = element;
    this.video.srcObject = this.mediaStream;
  }

  setStream(s: MediaStream) {
    if (!this.video) {
      throw new Error("Don't set the stream before binding to a video element");
    }

    this.mediaStream = s;

    this.video.srcObject = this.mediaStream;
    console.log("set stream on video element", this);
  }
}
