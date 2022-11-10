<script lang="ts">
  import Looc from "./Looc.svelte";
  import Logo from "./Logo.svelte";

  let userName: string;
  let showLooc = false;

  async function submitUserNameAndShowLooc() {
    if (userName) {
      showLooc = true;
    }
  }
</script>

{#if showLooc}
  <Looc {userName} />
{:else}
  <main class="h-full w-full flex flex-col items-center justify-center">
    <Logo width="50%" />
    <form
      id="call-form"
      class="flex flex-wrap items-center justify-center"
      on:submit|preventDefault={submitUserNameAndShowLooc}
    >
      <label class="block">
        <span
          class="block text-sm font-medium text-slate-700 after:content-['*'] after:text-red-500"
          >Username:</span
        >
        <input
          type="text"
          class="peer mt-1 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
          bind:value={userName}
          required
        />
        <p class="mt-2 invisible peer-invalid:visible text-pink-600 text-sm">
          Please provide a username
        </p>
      </label>
      <input hidden type="submit" />
      <div class="flex justify-center gap-10 p-5">
        <button
          class="rounded-2xl text-white px-2 py-1 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 focus:outline-none focus:ring focus:ring-violet-300"
          type="submit">Submit</button
        >
      </div>
    </form>
  </main>
{/if}
