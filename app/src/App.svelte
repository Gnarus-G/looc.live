<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import manager from "./lib/manage-call";
  import RTCSignalingServer from "./lib/signaling-server";

  const isAnswerer = window.location.pathname.includes("answer");

  let callId = "looc";
  let pc = new RTCPeerConnection();
  let signaling = new RTCSignalingServer(callId);
  const { call, answer } = manager(signaling, pc);

  let localStream: MediaStream;
  let localVideo: HTMLVideoElement;
  let remoteVideo: HTMLVideoElement;

  onMount(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        localStream = stream;
        localVideo.srcObject = stream;
        let remoteStream = new MediaStream();

        localStream.getTracks().forEach((t) => {
          pc.addTrack(t, localStream);
        });

        pc.ontrack = (event) => {
          event.streams[0].getTracks().forEach((t) => {
            remoteStream.addTrack(t);
          });
        };

        remoteVideo.srcObject = remoteStream;
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
    <button on:click={answer}>Answer</button>
  {:else}
    <button on:click={call}>Call</button>
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
  }
  video {
    border-radius: 0.2rem;
    width: max(300px, 20%);
  }
</style>
