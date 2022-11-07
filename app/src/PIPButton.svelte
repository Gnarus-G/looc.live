<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  let className = "";
  export { className as class };
  export let video: HTMLVideoElement;
  export let active = false;

  let canPip = false;

  function setPIPActive() {
    active = true;
  }

  function setPIPInactive() {
    active = false;
  }

  function setCanPIP() {
    canPip = true;
  }

  onMount(() => {
    video.addEventListener("enterpictureinpicture", setPIPActive);
    video.addEventListener("leavepictureinpicture", setPIPInactive);
    video.addEventListener("loadedmetadata", setCanPIP);
  });

  onDestroy(() => {
    video.removeEventListener("enterpictureinpicture", setPIPActive);
    video.removeEventListener("leavepictureinpicture", setPIPInactive);
    video.removeEventListener("loadedmetadata", setCanPIP);
  });

  async function pip() {
    if (document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    }
  }
</script>

{#if document.pictureInPictureEnabled && canPip}
  <button class={className} on:click={pip}>
    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24"
      ><path
        d="M11 13h8V7h-8Zm-7 7q-.825 0-1.412-.587Q2 18.825 2 18V6q0-.825.588-1.412Q3.175 4 4 4h16q.825 0 1.413.588Q22 5.175 22 6v12q0 .825-.587 1.413Q20.825 20 20 20Z"
      /></svg
    >
  </button>
{/if}
