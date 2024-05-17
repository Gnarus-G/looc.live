<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Draggable from "./Draggable.svelte";

  import { createAndSendAnswer, createAndSendOffer } from "./lib/negotiators";
  import RTCSignalingServer, { type Peer } from "./lib/signaling-server";
  import PipButton from "./PIPButton.svelte";

  export let userName: string;

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

  let signaling = new RTCSignalingServer(userName);
  let peers = signaling.peers();
  let remotePeer: Peer;

  const localStream = new MediaStream();
  let localMicStream: MediaStream | undefined;

  let pictureInPictureIsActivated: boolean;
  let connected = false;
  let micEnabled = false;
  let remoteStream: MediaStream;
  let localVideo: HTMLVideoElement;
  let remoteVideo: HTMLVideoElement;

  const trackSenders: RTCRtpSender[] = [];

  onMount(() => {
    pc.ontrack = (event) => {
      console.info("on remote track", event.streams);
      [remoteStream] = event.streams;
      console.info("on remote track", "all tracks", remoteStream.getTracks());
    };

    pc.oniceconnectionstatechange = () => {
      console.log("connection state", pc.iceConnectionState);
      connected = ["connected", "completed", "closed"].includes(
        pc.iceConnectionState,
      );
    };
  });

  $: {
    pc.onnegotiationneeded = async (event) => {
      console.log("let's parler", event);
      await createAndSendOffer(pc, signaling, remotePeer);
    };
  }

  onMount(() => {
    signaling.onAnswer((sdp) => pc.setRemoteDescription(sdp));
    signaling.onOffer(async (sdp, fromPeer) => {
      const isCurrentRemotePeer = remotePeer?.id === fromPeer.id;
      if (isCurrentRemotePeer) {
        return await createAndSendAnswer(pc, signaling, sdp, fromPeer);
      }

      if (window.confirm(`Answer call from ${fromPeer.userName}?`)) {
        remotePeer = fromPeer;
        await createAndSendAnswer(pc, signaling, sdp, fromPeer);
      }
    });
    signaling.onNewIceCandidate("answer", (aic) => pc.addIceCandidate(aic));
    signaling.onNewIceCandidate("offer", (oic) => pc.addIceCandidate(oic));
  });

  onMount(() => {
    signaling.onPeerConnected(() => {
      peers = signaling.peers();
    });

    signaling.onPeerDisconnected(() => {
      peers = signaling.peers();
    });
  });

  onDestroy(() => {
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
  });

  async function call(peer: Peer) {
    remotePeer = peer;
    // to trigger ice negotiation, the state of which
    // we depend on to know if we're connected and can speak to the remote peer
    await turnOnMic();
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
      localMicStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      localMicStream
        .getAudioTracks()
        .forEach((t) => pc.addTrack(t, localStream));
      micEnabled = true;
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleMic() {
    if (!localMicStream) {
      await turnOnMic();
    } else {
      micEnabled = !micEnabled;
    }
  }

  $: {
    if (localMicStream) localMicStream.getAudioTracks()[0].enabled = micEnabled;
  }

  async function turnOnScreenShare() {
    try {
      const screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1366,
          height: 768,
          frameRate: 30,
        },
        audio: true,
      });

      localStream.getVideoTracks().forEach((t) => {
        t.stop();
        trackSenders.forEach((s) => pc.removeTrack(s));
        localStream.removeTrack(t);
      });

      screenShareStream.getTracks().forEach((t) => {
        localStream.addTrack(t);
        const s = pc.addTrack(t, localStream);
        setVideoParams(s, 768);
        trackSenders.push(s);
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function setVideoParams(
    sender: RTCRtpSender,
    height: number,
    bitrate: number = 1000000,
  ) {
    const scaleRatio = (sender.track?.getSettings().height ?? 0) / height;
    const params = sender.getParameters();

    params.degradationPreference = "maintain-framerate";
    const [encoding] = params.encodings;
    if (encoding) {
      encoding.scaleResolutionDownBy = Math.max(scaleRatio, 1);
      encoding.maxBitrate = bitrate;
    }
    await sender.setParameters(params);
  }
</script>

{#if connected}
  <main class="h-full w-full flex items-center flex-col justify-around">
    <Draggable
      class="sm:fixed z-20 drop-shadow-2xl shadow-slate-300 bg-slate-800 sm:w-96 sm:rounded-lg w-full aspect-video transition-opacity {pictureInPictureIsActivated
        ? 'opacity-0'
        : 'opacity-100'}"
      left={8}
      top={8}
    >
      <video bind:this={localVideo} autoplay playsinline>
        <track kind="captions" />
      </video>
      {#if localVideo}
        <PipButton
          class="absolute bottom-1/4 right-10 fill-current text-white"
          bind:video={localVideo}
          bind:active={pictureInPictureIsActivated}
        />
      {/if}
    </Draggable>
    <video
      class="w-full h-full mx-auto aspect-auto peer"
      bind:this={remoteVideo}
      autoplay
      playsinline
    >
      <track kind="captions" />
    </video>
    <div
      class="absolute bottom-0 transition-opacity opacity-0 peer-hover:opacity-100 hover:opacity-100"
    >
      <div class="flex justify-center gap-10 p-5">
        <button
          class="min-w-16 flex items-center bg-blue-500 rounded-2xl px-3 py-1 hover:bg-blue-600 text-white transition active:scale-95"
          on:click={toggleMic}
        >
          <svg viewBox="0 0 24 24" height="20px" class="fill-current mr-1">
            {#if micEnabled}
              <path
                xmlns="http://www.w3.org/2000/svg"
                d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
              />
            {:else}
              <path
                xmlns="http://www.w3.org/2000/svg"
                d="M19.725 15.5 17.5 13.275q.175-.45.263-.925.087-.475.087-1.175h2.975q0 1.15-.263 2.3-.262 1.15-.837 2.025Zm-3.5-3.5L8.2 3.975V4.1q.325-1.175 1.413-2.05 1.087-.875 2.512-.875 1.75 0 2.975 1.212 1.225 1.213 1.225 2.938v5.95q0 .225-.037.437-.038.213-.063.288Zm-5.6 10.85v-3.125Q7.475 19.3 5.45 16.85t-2.025-5.675H6.45q0 2.375 1.663 4.025 1.662 1.65 4.012 1.65 1.15 0 2.163-.425 1.012-.425 1.787-1.15l2.175 2.175q-.925.9-2.087 1.488-1.163.587-2.538.787v3.125Zm9.025-.35L1.125 3.975 2.95 2.15 21.5 20.675Z"
              />
            {/if}
          </svg>
          Mic</button
        >
        {#if navigator.mediaDevices.getDisplayMedia}
          <button
            class="flex items-center bg-blue-500 hover:bg-blue-600 text-white rounded px-3 transition active:scale-95"
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
      </div>
    </div>
  </main>
{:else}
  <main
    class="h-full container max-w-md mx-auto w-full flex gap-5 flex-col justify-center"
  >
    {#await peers}
      <p class="mx-auto text-xl text-blue-200 animate-pulse">Loading...</p>
    {:then peers}
      {#if peers.data.length === 0}
        <h2 class="font-semibold text-slate-100">No peers online, currently</h2>
      {:else}
        <h2 class="font-semibold text-lg text-slate-100">
          Peers currently online:
        </h2>
      {/if}
      <ul>
        {#each peers.data as peer}
          <li class="w-full">
            <p class="text-[0.5rem] font-light">
              {peer.id}
            </p>
            <div class="flex justify-between gap-5 py-2 items-center border-t">
              <p class="font-semibold text-xl text-slate-300">
                {peer.userName}
              </p>
              <button
                class="min-w-16 rounded text-white px-2 py-1 bg-violet-700 hover:bg-violet-600 active:bg-violet-900 focus:outline-none
                transition active:scale-95"
                type="submit"
                on:click={() => call(peer)}>Call</button
              >
            </div>
          </li>
        {/each}
      </ul>
    {/await}
  </main>
{/if}

<svelte:head>
  <title
    >Looc: {userName} {remotePeer ? `and ${remotePeer.userName}` : ""}</title
  >
</svelte:head>
