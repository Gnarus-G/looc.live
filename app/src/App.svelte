<script lang="ts">
  import manager from "./lib/manage-call";
  import RTCSignalingServer from "./lib/signaling-server";

  const isAnswerer = window.location.pathname.includes("answer");
  const iceServersConfig = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  let pc = new RTCPeerConnection(iceServersConfig);

  let callId = "";
  let localStream: MediaStream;
  let remoteStream: MediaStream;
  let localVideo: HTMLVideoElement;
  let remoteVideo: HTMLVideoElement;

  function createPeerStream(pc: RTCPeerConnection) {
    remoteStream = new MediaStream();

    pc.ontrack = (event) => {
      console.info("on remote track", event.streams);
      const stream = event.streams[0];
      console.info("on remote track", stream.getTracks());
      event.streams[0].getTracks().forEach((t) => {
        remoteStream.addTrack(t);
      });
    };

    remoteVideo.srcObject = remoteStream;
  }

  function startCall() {
    if (callId) {
      let signaling = new RTCSignalingServer(callId);
      pc = new RTCPeerConnection(iceServersConfig);
      createPeerStream(pc);
      manager(signaling, pc).call();
    }
  }

  function answerCall() {
    if (callId) {
      let signaling = new RTCSignalingServer(callId);
      pc = new RTCPeerConnection(iceServersConfig);
      createPeerStream(pc);
      manager(signaling, pc).answer();
    }
  }

  $: {
    console.info("resetting local peer");
    localStream?.getTracks().forEach((t) => {
      pc.addTrack(t, localStream);
    });
  }

  async function turnOnMic() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      localVideo.srcObject = localStream;
    } catch (e) {
      console.error(e);
    }
  }
</script>

<main>
  <div class="peers">
    <video bind:this={localVideo} autoplay playsinline controls>
      <track kind="captions" />
    </video>
    <video bind:this={remoteVideo} autoplay playsinline controls>
      <track kind="captions" />
    </video>
  </div>
  <input type="text" bind:value={callId} />
  <button on:click={turnOnMic}>Mic</button>
  {#if isAnswerer}
    <button on:click={answerCall}>Answer</button>
  {:else}
    <button on:click={startCall}>Start call</button>
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    gap: 1rem;
    place-content: center;
    align-items: center;
    box-sizing: border-box;
  }
  div.peers {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    width: 100%;
    justify-content: center;
  }
  video {
    background-color: #4a4a4a;
    border-radius: 0.2rem;
    width: max(300px, 20%);
  }
</style>
