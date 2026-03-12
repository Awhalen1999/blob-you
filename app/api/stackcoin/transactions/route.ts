import { NextRequest, NextResponse } from "next/server";
import { getTransactionsForUser } from "@/lib/stackcoin";

export async function GET(request: NextRequest) {
  const discordId = new URL(request.url).searchParams.get("discord_id");
  if (!discordId) {
    return NextResponse.json({ error: "missing discord_id" }, { status: 400 });
  }

  try {
    const result = await getTransactionsForUser(discordId);
    if (!result) {
      return NextResponse.json({ transactions: [], balance: null, userId: null });
    }
    return NextResponse.json({
      transactions: result.transactions,
      balance: result.user.balance,
      userId: result.user.id,
    });
  } catch (err) {
    console.error("[stackcoin/transactions] error:", err);
    return NextResponse.json({ transactions: [], balance: null, userId: null });
  }
}
