<script lang="ts">
  let className = "";
  export { className as class };

  export let left = 0;
  export let top = 0;

  let draggableContainer: HTMLDivElement;

  let moving = false;

  function onMouseDown() {
    moving = true;
  }

  function onMouseMove(e: MouseEvent) {
    if (moving) {
      left += e.movementX;
      top += e.movementY;

      if (left < 0) {
        left = 0;
      }
      if (top < 0) {
        top = 0;
      }

      if (left + draggableContainer.clientWidth > window.innerWidth) {
        left = window.innerWidth - draggableContainer.clientWidth;
      }

      if (top + draggableContainer.clientHeight > window.innerHeight) {
        top = window.innerHeight - draggableContainer.clientHeight;
      }
    }
  }

  function onMouseUp() {
    moving = false;
  }
</script>

<div
  bind:this={draggableContainer}
  on:mousedown={onMouseDown}
  style="left: {left}px; top: {top}px;"
  class="draggable {className}"
>
  <slot />
</div>

<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

<style>
  .draggable {
    user-select: none;
    cursor: move;
  }
</style>
