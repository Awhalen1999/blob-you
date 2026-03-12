import { Client, Gateway } from "stackcoin";
import type { RequestAcceptedEvent } from "stackcoin";

// ---------------------------------------------------------------------------
// SDK Client (singleton)
// ---------------------------------------------------------------------------

const client = new Client({ token: process.env.STACKCOIN_BOT_TOKEN! });

// ---------------------------------------------------------------------------
// Helpers — single source of truth for all StackCoin operations
// ---------------------------------------------------------------------------

export async function getUserByDiscordId(
  discordId: string,
): Promise<{ id: number; balance: number; username: string } | null> {
  const users = await client.getUsers({ discordId });
  const u = users[0];
  if (!u || u.id == null) return null;
  return { id: u.id, balance: u.balance, username: u.username };
}

export async function createPaymentRequest(
  toUserId: number,
  amount: number,
  label: string,
): Promise<number> {
  const res = await client.createRequest(toUserId, amount, { label });
  return res.request_id;
}

export async function sendPayment(
  toUserId: number,
  amount: number,
  label: string,
): Promise<void> {
  await client.send(toUserId, amount, { label });
}

export async function getRequestStatus(
  requestId: number,
): Promise<string> {
  const req = await client.getRequest(requestId);
  return req.status;
}

export type StkTransaction = {
  id: number;
  amount: number;
  from: { id?: number; username?: string };
  to: { id?: number; username?: string };
  time: string;
  label?: string | null;
};

export async function getTransactionsForUser(discordId: string): Promise<{
  transactions: StkTransaction[];
  user: { id: number; balance: number; username: string };
} | null> {
  const user = await getUserByDiscordId(discordId);
  if (!user) return null;

  const res = await fetch(
    `https://stackcoin.world/api/transactions?includes_discord_id=${discordId}&limit=100`,
    { headers: { Authorization: `Bearer ${process.env.STACKCOIN_BOT_TOKEN}` } },
  );
  if (!res.ok) return { transactions: [], user };

  const data = await res.json();
  return { transactions: data.transactions ?? [], user };
}

// ---------------------------------------------------------------------------
// Gateway — real-time event listener for payment acceptance
// ---------------------------------------------------------------------------

type TrackedRequest = { roomId: string; role: "host" | "guest" };
const trackedRequests = new Map<number, TrackedRequest>();

let gateway: Gateway | null = null;
let gatewayStarted = false;

export function startGateway(partykitHost: string) {
  if (gatewayStarted) return;
  gatewayStarted = true;

  gateway = new Gateway({ token: process.env.STACKCOIN_BOT_TOKEN!, client });

  gateway.on("request.accepted", async (event) => {
    const e = event as RequestAcceptedEvent;
    const tracked = trackedRequests.get(e.data.request_id);
    if (!tracked) return;

    trackedRequests.delete(e.data.request_id);

    try {
      await fetch(`https://${partykitHost}/party/blob-you/${tracked.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "request_accepted",
          role: tracked.role,
          requestId: e.data.request_id,
        }),
      });
    } catch (err) {
      console.error("[stackcoin] gateway notify error:", err);
    }
  });

  gateway.connect().catch((err) => {
    console.error("[stackcoin] gateway connect error:", err);
    gatewayStarted = false;
    gateway = null;
  });

  console.log("[stackcoin] gateway started, host:", partykitHost);
}

export function trackRequest(
  requestId: number,
  roomId: string,
  role: "host" | "guest",
) {
  trackedRequests.set(requestId, { roomId, role });
}

export function untrackRequests(...requestIds: number[]) {
  for (const id of requestIds) trackedRequests.delete(id);
}
