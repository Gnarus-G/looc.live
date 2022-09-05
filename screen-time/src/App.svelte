<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import RTCSignalingServer from "./lib/signaling-server";

  let callId = "love";
  let pc = new RTCPeerConnection();
  let signaling = new RTCSignalingServer(callId, pc);

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

  let sdpOfferAsString: string;
  let sdpAnswerAsString: string;

  async function call() {
    // save my ice candidates
    pc.onicecandidate = (event) => {
      console.info("offer candidates", event.candidate);
      if (!event.candidate) return;
      signaling.addIceCandidates(event.candidate, "offer");
    };

    // create an offer
    const sdpOffer = await pc.createOffer();
    console.info("creating an offer");
    await pc.setLocalDescription(sdpOffer);
    sdpOfferAsString = JSON.stringify(sdpOffer);
    await signaling.offer(sdpOffer);
    navigator.clipboard.writeText(callId);

    // listen for answer
    signaling.onAnswer((a) => pc.setRemoteDescription(a));

    // add ice candiates for who answered
    signaling.onNewIceCandidate("answer", (i) => pc.addIceCandidate(i));
  }

  async function answer() {
    // save my answer ice candidates
    pc.onicecandidate = (event) => {
      console.info("offer candidates", event.candidate);
      if (!event.candidate) return;
      signaling.addIceCandidates(event.candidate, "answer");
    };

    const offer = await signaling.getOffer();
    pc.setRemoteDescription(new RTCSessionDescription(offer));

    const sdpAnswer = await pc.createAnswer();
    await pc.setLocalDescription(sdpAnswer);

    await signaling.answer(sdpAnswer);
    sdpAnswerAsString = JSON.stringify(sdpAnswer);

    signaling.onNewIceCandidate("offer", (i) => pc.addIceCandidate(i));
  }

  onDestroy(() => {
    localStream?.getTracks().forEach((t) => t.stop());
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
  {#if window.location.pathname.includes("answer")}
    <button on:click={answer}>Answer</button>
    <pre>{sdpAnswerAsString}</pre>
  {:else}
    <button on:click={call}>Call</button>
    <pre>{sdpOfferAsString}</pre>
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
