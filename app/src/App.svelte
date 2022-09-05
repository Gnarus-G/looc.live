<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import manager from "./lib/manage-call";
  import RTCSignalingServer from "./lib/signaling-server";

  const isAnswerer = window.location.pathname.includes("answer");

  let pc = new RTCPeerConnection();

  let callId = "";
  let localStream: MediaStream;
  let remoteStream: MediaStream;
  let localVideo: HTMLVideoElement;
  let remoteVideo: HTMLVideoElement;

  function startCall() {
    if (callId) {
      let signaling = new RTCSignalingServer(callId);
      manager(signaling, pc).call();
    }
  }

  function answerCall() {
    if (callId) {
      let signaling = new RTCSignalingServer(callId);
      manager(signaling, pc).answer();
    }
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
        remoteStream = new MediaStream();

        localStream.getTracks().forEach((t) => {
          pc.addTrack(t, localStream);
        });

        pc.ontrack = (event) => {
          event.streams[0].getTracks().forEach((t) => {
            remoteStream.addTrack(t);
          });
        };

        pc.onconnectionstatechange = () => {
          pc.connectionState === "connected";
          remoteVideo.srcObject = remoteStream;
        };
      })
      .catch((e) => {
        console.error(e);
      });
  });

  onDestroy(() => {
    localStream?.getTracks().forEach((t) => t.stop());
    pc.close();
  });
</script>

<main>
  <div>
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
  div {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }
  video {
    background-color: #4a4a4a;
    border-radius: 0.2rem;
    width: max(300px, 20%);
  }
</style>
