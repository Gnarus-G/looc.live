<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  import manager from "./lib/manage-call";
  import RTCSignalingServer from "./lib/signaling-server";

  let pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  });

  const localStream = new MediaStream();

  let callId = "";
  let connected = false;
  let remoteStream: MediaStream;
  let localVideo: HTMLVideoElement;
  let remoteVideo: HTMLVideoElement;

  onMount(() => {
    pc.ontrack = (event) => {
      console.info("on remote track", event.streams);
      [remoteStream] = event.streams;
      console.info("on remote track", "all tracks", remoteStream.getTracks());
    };
    pc.oniceconnectionstatechange = () => {
      console.log("connection state", pc.iceConnectionState);
      connected = ["connected", "completed", "closed"].includes(
        pc.iceConnectionState
      );
    };
  });

  onDestroy(() => {
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
  });

  async function joinACall() {
    if (!callId) return;

    let signaling = new RTCSignalingServer(callId);
    const m = manager(signaling, pc);
    try {
      await m.answer(await signaling.getOffer());
    } catch (e) {
      await m.offer();
    }
  }

  $: {
    if (remoteVideo) {
      remoteVideo.srcObject = remoteStream;
    }
  }

  $: {
    if (localVideo) {
      localVideo.srcObject = localStream;
    }
  }

  async function turnOnMic() {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStream.getAudioTracks().forEach((t) => pc.addTrack(t, localStream));
    } catch (e) {
      console.error(e);
    }
  }

  async function turnOnScreenShare() {
    try {
      const screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1920,
          height: 1080,
        },
        audio: true,
      });
      screenShareStream.getTracks().forEach((t) => {
        localStream.addTrack(t);
        pc.addTrack(t, localStream);
      });
    } catch (e) {
      console.error(e);
    }
  }
</script>

<main class="h-full w-full flex items-center flex-col justify-around">
  <div class="w-full flex-grow pb-2">
    <video
      class="sm:fixed z-10 drop-shadow-2xl shadow-slate-300 bg-gray-600 sm:left-2 sm:top-2 sm:w-96 sm:rounded-lg w-full aspect-video"
      bind:this={localVideo}
      autoplay
      playsinline
    >
      <track kind="captions" />
    </video>
    <video
      class="w-full max-h-[768px] bg-gray-400 mx-auto aspect-auto"
      bind:this={remoteVideo}
      autoplay
      playsinline
    >
      <track kind="captions" />
    </video>
  </div>
  <form
    id="call-form"
    class="mt-auto flex justify-center"
    on:submit|preventDefault={joinACall}
  >
    <label class="block">
      <span
        class="block text-sm font-medium text-slate-700 after:content-['*'] after:text-red-500"
        >Call id</span
      >
      <input
        type="text"
        class="peer mt-1 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
        bind:value={callId}
        required
      />
      <p class="mt-2 invisible peer-invalid:visible text-pink-600 text-sm">
        Please provide a call id
      </p>
    </label>
    <input type="submit" class="hidden" />
  </form>
  <div class="flex justify-center gap-10 p-5">
    <button
      class="flex items-center bg-blue-500 text-white rounded-2xl px-2 hover:bg-blue-600"
      on:click={turnOnMic}
    >
      <svg viewBox="0 0 24 24" height="20px" class="fill-current mr-1">
        <path
          xmlns="http://www.w3.org/2000/svg"
          d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
        />
      </svg>
      Mic</button
    >
    {#if navigator.mediaDevices.getDisplayMedia}
      <button
        class="flex items-center bg-blue-500 hover:bg-blue-600 text-white rounded-2xl px-2"
        on:click={turnOnScreenShare}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="20px"
          viewBox="0 0 24 24"
          class="fill-current mr-1"
          ><path d="M0 0h24v24H0V0z" fill="none" /><path
            d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zm-7-3.53v-2.19c-2.78 0-4.61.85-6 2.72.56-2.67 2.11-5.33 6-5.87V7l4 3.73-4 3.74z"
          /></svg
        >
        Screen Share</button
      >
    {/if}
    {#if !connected}
      <button
        form="call-form"
        class="rounded-2xl text-white px-2 py-1 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 focus:outline-none focus:ring focus:ring-violet-300"
        type="submit">Join call</button
      >
    {/if}
  </div>
</main>
