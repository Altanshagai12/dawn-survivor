// INIT and scoped-token minting are independent in both Usions hosts.
// Wait only for credentials; this never opens a wallet or creates an order.
export async function waitForCommerceAuth(platform, previousToken = null, {
  attempts = 40, interval = 200,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    if (!platform.embedded && !platform.awaitingHost) return null;
    const token = platform.getAuthToken?.();
    if (platform.embedded && token && token !== previousToken) return token;
    if (attempt < attempts) await pause(interval);
  }
  return null;
}
