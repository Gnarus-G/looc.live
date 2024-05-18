<script lang="ts">
  import Looc from "./Looc.svelte";

  let userName: string;
  let showLooc = false;
  let error = false;

  async function submitUserNameAndShowLooc() {
    if (userName) {
      showLooc = true;
      error = false;
    } else {
      error = true;
    }
  }
</script>

{#if showLooc}
  <Looc {userName} />
{:else}
  <main class="h-full w-full flex flex-col items-center justify-center">
    <img
      width="50%"
      src="/logo.svg"
      alt="scalable vectors graphics spelling Looc"
    />
    <form
      id="call-form"
      class="md:flex items-end justify-center"
      on:submit|preventDefault={submitUserNameAndShowLooc}
      novalidate
    >
      <label class="block">
        <span
          class="block text-sm font-medium text-slate-100 after:content-['*'] after:text-red-500"
          >Username</span
        >
        <input
          type="text"
          class="peer mt-1 px-3 py-1 bg-white border shadow-sm {error
            ? 'border-red-400'
            : 'border-slate-300'} placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
          bind:value={userName}
          required
        />
        {#if error}
          <p class="mt-2 text-red-400 text-sm">Please provide a username</p>
        {/if}
      </label>
      <input hidden type="submit" />
      <div class="flex justify-center gap-10 py-2 md:py-0 px-2">
        <button
          class="rounded text-white px-2 py-1 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 focus:outline-none active:scale-95 focus:ring-violet-300"
          type="submit">Submit</button
        >
      </div>
    </form>
  </main>
{/if}
