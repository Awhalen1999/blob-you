import { Client } from 'stackcoin';

const STK_BASE_URL = 'https://stackcoin.world';

let _client: Client | null = null;
function getStkClient(): Client {
  if (!_client) {
    const token = process.env.STACKCOIN_BOT_TOKEN;
    if (!token) throw new Error('STACKCOIN_BOT_TOKEN not set');
    _client = new Client({ token });
  }
  return _client;
}

export async function getUserByDiscordId(
  discordId: string,
): Promise<{ id: number; balance: number; username: string } | null> {
  const users = await getStkClient().getUsers({ discordId });
  const u = users[0];
  if (!u || u.id == null) return null;
  return { id: u.id, balance: u.balance, username: u.username };
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

  const headers = { Authorization: `Bearer ${process.env.STACKCOIN_BOT_TOKEN}` };
  const opts = { headers, cache: 'no-store' as const };
  const [fromRes, toRes] = await Promise.all([
    fetch(`${STK_BASE_URL}/api/transactions?from_user_id=${user.id}&limit=100`, opts),
    fetch(`${STK_BASE_URL}/api/transactions?to_user_id=${user.id}&limit=100`, opts),
  ]);
  const [fromData, toData] = await Promise.all([
    fromRes.ok ? fromRes.json() : { transactions: [] },
    toRes.ok ? toRes.json() : { transactions: [] },
  ]);

  const seen = new Set<number>();
  const all: StkTransaction[] = [];
  for (const tx of [...(fromData.transactions ?? []), ...(toData.transactions ?? [])]) {
    if (!seen.has(tx.id)) {
      seen.add(tx.id);
      all.push(tx);
    }
  }
  all.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return { transactions: all, user };
}
