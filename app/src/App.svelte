<script lang="ts">
  import { onDestroy, onMount } from "svelte";
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

  onMount(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        localStream = stream;
        localVideo.srcObject = stream;
      })
      .catch((e) => {
        console.error(e);
      });
  });

  function createPeerStream(pc: RTCPeerConnection) {
    remoteStream = new MediaStream();

    pc.ontrack = (event) => {
      console.info("track", event);
      event.streams[0].getTracks().forEach((t) => {
        remoteStream.addTrack(t);
      });
    };

    remoteVideo.srcObject = remoteStream;
  }

  onDestroy(() => {
    localStream?.getTracks().forEach((t) => t.stop());
    remoteStream?.getTracks().forEach((t) => t.stop());
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    pc.close();
  });
</script>

<main>
  <div class="peers">
    <video bind:this={localVideo} autoplay playsinline muted>
      <track kind="captions" />
    </video>
    <video bind:this={remoteVideo} autoplay playsinline muted>
      <track kind="captions" />
    </video>
  </div>
  <input type="text" bind:value={callId} />
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
