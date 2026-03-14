# StackCoin Integration

Handles in-game wagering via the StackCoin economy. Only available to Discord users with a StackCoin account.

## Architecture

```
partykit/server.ts        ← wager state machine + StackCoin SDK (Client)
lib/stackcoin.ts          ← balance/transaction helpers for Next.js UI
app/api/stackcoin/*       ← balance + transaction routes (read-only)
```

```
PartyKit ──SDK Client──► StackCoin API   (create requests, poll status, send payouts)
Next.js  ──SDK Client──► StackCoin API   (balance lookups, transaction history)
```

All wager logic (request creation, acceptance polling, payouts, refunds) runs inside PartyKit's stateful Durable Object. No Vercel serverless functions are in the wager path.

## Env Vars

```
STACKCOIN_BOT_TOKEN=<bot token>          # set in both Vercel and PartyKit
NEXT_PUBLIC_PARTYKIT_HOST=blob-you.awhalen1999.partykit.dev
```

## PartyKit Server — `partykit/server.ts`

The PartyKit server owns the entire wager lifecycle using the `stackcoin` SDK `Client` directly.

| Method | What it does |
|---|---|
| `getStkClient()` | Lazy-init SDK Client from `STACKCOIN_BOT_TOKEN` |
| `initiateWager()` | Look up users, create payment requests, start polling |
| `pollRequestStatus()` | Poll `getRequest()` every 3s for accepted/denied status |
| `issueRefundAndReset(reason)` | Refund whoever paid via `client.send()`, reset state |
| `payoutWager(winner)` | Send winnings via `client.send()` |
| `resetWager()` | Clear all wager state, stop polling, cancel timers |

## Service Layer — `lib/stackcoin.ts`

Used only by Next.js routes for read-only operations (balance, transaction history).

| Function | What it does |
|---|---|
| `getUserByDiscordId(discordId)` | Look up user → `{ id, balance, username }` |
| `getTransactionsForUser(discordId)` | Fetch transaction history for UI display |

## Next.js Routes

| Route | Purpose |
|---|---|
| `GET /api/stackcoin/balance` | Fetch user balance |
| `GET /api/stackcoin/transactions` | Fetch transaction history for the popup |

## Wager Flow

### Acceptance via Polling

PartyKit creates payment requests via `client.createRequest()` and polls `client.getRequest()` every 3 seconds to check status:

```
1. Wager accepted by guest → initiateWager()
2. SDK Client looks up both users via getUsers({ discordId })
3. SDK Client creates two payment requests via createRequest()
4. Polling starts: getRequest() every 3s for each request
5. Player accepts DM → poll sees status = "accepted"
6. Both accepted → wagerStatus = "confirmed", broadcast to clients
7. Player denies DM → poll sees status = "denied" → abort + refund
```

### Wager State Machine

```
none → proposed → pending_payment → confirmed → complete
```

Every state except `complete` can transition back to `none` via refund + reset.

## Two Outcomes

### Happy Path: Payout

```
propose → accept → both pay DM → battle → clients agree → payout → complete
```

Winner receives `amount * 2`. On tie, each player gets `amount` back.

### Sad Path: Refund

```
[any failure] → refund whoever paid → reset to none
```

Failures that trigger refund (with reason):
- Player disconnects (`disconnect`)
- DM payment timeout — 5 min (`payment_timeout`)
- Battle report timeout — 3 min after battle starts (`report_timeout`)
- Player denies payment request in Discord (`request_denied`)
- Payout SDK call fails (`payout_failed`)
- Clients report different winners (`dispute`)

Failures before coins move (just reset, no refund needed):
- Guest declines proposal
- Wager create SDK call fails

### The Rule

> Once `wagerStatus` leaves `none`, it either reaches `complete` (payout succeeded) or gets refunded and reset back to `none`. No wager is ever left dangling.

## Race Protection

Both resolution functions have stale-state guards:
- `issueRefundAndReset()` bails if `wagerStatus` is `none` or `complete`
- `payoutWager()` bails after `await send` if `wagerStatus` is no longer `confirmed`

Whichever runs first wins. No double-payout, no double-refund.

## Timeouts

- **Payment timeout:** 5 min. If both players don't accept the DM, refund whoever paid.
- **Report timeout:** 3 min after `battle_start`. If both clients don't report a winner, refund both.

## Files

```
partykit/server.ts                        # Wager state machine + SDK Client (all wager logic)
lib/stackcoin.ts                          # SDK Client helpers (balance, transactions)
app/api/stackcoin/balance/route.ts        # Fetch balance
app/api/stackcoin/transactions/route.ts   # Fetch transaction history
contexts/PartyKitContext.tsx              # Client wager state
```
