<script lang="ts">
  import { onMount } from "svelte";

  import RTCSignalingServer from "./lib/signaling-server";
  import Room from "./Room.svelte";
  import { Negotiation } from "./lib/negotiation";
  import type { PeerDTO } from "./lib/schema";

  export let userName: string;
  let signaling = new RTCSignalingServer(userName);
  let negotiation = new Negotiation(signaling);

  let peers = signaling.peers();
  let remotePeer: PeerDTO;

  onMount(() => {
    /* negotiation.pc.oniceconnectionstatechange = () => { */
    /*   console.log("connection state", negotiation.pc.iceConnectionState); */
    /*   connected = ["connected", "completed", "closed"].includes( */
    /*     negotiation.pc.iceConnectionState, */
    /*   ); */
    /* }; */

    signaling.ondescription(async (_, fromPeer) => {
      if (window.confirm(`Answer call from ${fromPeer.userName}?`)) {
        remotePeer = fromPeer;
        negotiation.prepare(remotePeer);
      }
    });
  });

  onMount(() => {
    signaling.onPeerConnected(() => {
      peers = signaling.peers();
    });

    signaling.onPeerDisconnected(() => {
      peers = signaling.peers();
    });
  });

  async function call(peer: PeerDTO) {
    remotePeer = peer;
    negotiation.prepare(remotePeer);
  }
</script>

{#if !!remotePeer}
  <Room {negotiation} />
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
