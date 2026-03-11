export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startGateway } = await import("@/lib/stackcoin");
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
    if (host) {
      startGateway(host);
    } else {
      console.warn("[instrumentation] NEXT_PUBLIC_PARTYKIT_HOST not set, skipping StackCoin gateway");
    }
  }
}
