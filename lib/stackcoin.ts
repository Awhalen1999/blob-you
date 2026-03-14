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

  const res = await fetch(
    `${STK_BASE_URL}/api/transactions?includes_discord_id=${discordId}&limit=100`,
    { headers: { Authorization: `Bearer ${process.env.STACKCOIN_BOT_TOKEN}` } },
  );
  if (!res.ok) return { transactions: [], user };

  const data = await res.json();
  return { transactions: data.transactions ?? [], user };
}
