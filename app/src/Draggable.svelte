<script lang="ts">
  let className = "";
  export { className as class };

  export let left = 0;
  export let top = 0;
  let width: number;
  let height: number;

  let winWidth: number;
  let winHeight: number;

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

      if (left + width > winWidth) {
        left = winWidth - width;
      }

      if (top + height > winHeight) {
        top = winHeight - height;
      }
    }
  }

  function onMouseUp() {
    moving = false;
  }
</script>

<div
  bind:clientWidth={width}
  bind:clientHeight={height}
  on:mousedown={onMouseDown}
  style="left: {left}px; top: {top}px;"
  class="draggable {className}"
>
  <slot />
</div>

<svelte:window
  on:mouseup={onMouseUp}
  on:mousemove={onMouseMove}
  bind:innerWidth={winWidth}
  bind:innerHeight={winHeight}
/>

<style>
  .draggable {
    user-select: none;
    cursor: move;
  }
</style>
