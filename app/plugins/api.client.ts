export default defineNuxtPlugin(async () => {
  // On web (Netlify), $fetch("/api/...") resolves against the current origin — no changes needed.
  // In Electron production, the origin is file://, so we must point $fetch at the Nitro server.

  let port = 0;
  let apiBase = "";

  if (import.meta.client && window.electronAPI) {
    let fetchedPort = 3000;

    try {
      fetchedPort = await window.electronAPI.getNitroPort();
    } catch (e) {
      console.error(
        "Failed to fetch Nitro port from Electron main process:",
        e
      );
    }

    // If port is 0, we're likely in dev mode where Nuxt is served from localhost:3000
    // and $fetch already resolves correctly
    if (fetchedPort) {
      port = fetchedPort;
      apiBase = `http://localhost:${port}`;

      // Globally override $fetch defaults so all relative $fetch("/api/...")
      // calls resolve against the Nitro server
      globalThis.$fetch = globalThis.$fetch.create({
        baseURL: apiBase,
      });
    }
  }

  return {
    provide: {
      nitroPort: port,
      apiBase,
    },
  };
});
