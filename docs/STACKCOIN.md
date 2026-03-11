# StackCoin Integration

Handles in-game wagering via the StackCoin economy. Only available to Discord users with a StackCoin account.

## Architecture

```
lib/stackcoin.ts          ← single service layer (SDK client + gateway)
  ├── SDK Client           ← all REST calls to StackCoin API
  └── Gateway (WebSocket)  ← real-time payment acceptance events

app/api/stackcoin/*       ← thin route wrappers calling lib/stackcoin.ts
partykit/server.ts        ← game logic, receives gateway push via onRequest()
instrumentation.ts        ← starts gateway on Next.js server boot
```

```
PartyKit ──fetch──► Next.js routes ──SDK──► StackCoin API
StackCoin Gateway ──push──► Next.js ──HTTP POST──► PartyKit room
```

## Env Vars

```
STACKCOIN_BOT_TOKEN=<bot token>
NEXT_PUBLIC_PARTYKIT_HOST=blob-you.awhalen1999.partykit.dev
```

## Service Layer — `lib/stackcoin.ts`

All StackCoin interactions go through one file. No route touches the StackCoin API directly.

| Function | What it does |
|---|---|
| `getUserByDiscordId(discordId)` | Look up user → `{ id, balance, username }` |
| `createPaymentRequest(userId, amount, label)` | Send DM payment request → returns `requestId` |
| `sendPayment(userId, amount, label)` | Send coins to a user (payout + refunds) |
| `getRequestStatus(requestId)` | Check if a payment request was accepted |
| `startGateway(partykitHost)` | Connect WebSocket, listen for `request.accepted` events |
| `trackRequest(requestId, roomId, role)` | Register a request for gateway notifications |
| `untrackRequests(...requestIds)` | Stop tracking requests |

## Next.js Routes

| Route | Purpose |
|---|---|
| `GET /api/stackcoin/balance` | Fetch user balance |
| `POST /api/stackcoin/wager/create` | Create payment requests + register with gateway |
| `POST /api/stackcoin/wager/payout` | Pay winner `amount * 2` (or refund each on tie) |
| `POST /api/stackcoin/wager/refund` | Partial refund — only refunds players who already paid |

## Gateway — Real-Time Payment Events

Instead of polling, the StackCoin SDK Gateway (WebSocket) pushes `request.accepted` events instantly.

```
1. Wager created → two payment requests sent via DM
2. Gateway tracks both request IDs
3. Player accepts DM → gateway receives request.accepted event
4. Gateway POSTs to PartyKit room: { type: "request_accepted", role: "host" | "guest" }
5. PartyKit room updates local hostAccepted/guestAccepted flags
6. Both accepted → wagerStatus = "confirmed", broadcast to clients
```

The gateway starts automatically via `instrumentation.ts` when Next.js boots.

## Wager State Machine

```
none → proposed → pending_payment → confirmed → complete
                                                    ↑
                                             (payout 200 only)
```

Every state except `complete` can transition back to `none` via refund+reset.

## Two Outcomes

### Happy Path: Payout

```
propose → accept → both pay DM → battle → clients agree → payout 200 → complete
```

Winner receives `amount * 2`. On tie, each player gets `amount` back.

### Sad Path: Refund

```
[any failure] → refund whoever paid → reset
```

Failures that trigger refund:
- Player disconnects (any phase after proposal)
- DM payment timeout (5 min)
- Battle report timeout (3 min after battle starts)
- Payout API returns non-200 or throws
- Clients report different winners (dispute)

Failures before coins move (just reset, no refund needed):
- Guest declines proposal
- Wager create API fails

### The Rule

> Once `wagerStatus` leaves `none`, it either reaches `complete` (payout succeeded) or gets refunded and reset back to `none`. No wager is ever left dangling.

## Server Architecture

All wager logic lives in `partykit/server.ts`. The server owns:

- **Wager state** (`wagerStatus`, `wagerAmount`) — synced to clients via `RoomState`
- **Private state** (discord IDs, acceptance flags, reported winners) — server only
- **`onRequest()`** — HTTP handler that receives gateway push notifications
- **`payoutWager(winner)`** — happy path. On 200: set `complete`. On failure: refund.
- **`issueRefundAndReset()`** — sad path. Uses local `hostAccepted`/`guestAccepted` flags to know who paid, refunds them, resets.
- **`resetWager()`** — clears all wager state (status, amount, flags, timers).

### Race Protection

Both resolution functions have stale-state guards:
- `issueRefundAndReset()` bails if `wagerStatus` is `none` or `complete`
- `payoutWager()` bails after `await fetch` if `wagerStatus` is no longer `confirmed`

Whichever runs first wins. No double-payout, no double-refund.

### Timeouts

- **Payment timeout:** 5 min. If both players don't accept the DM, refund whoever paid.
- **Report timeout:** 3 min after `battle_start`. If both clients don't report a winner, refund both.

## Client Architecture

The client (`PartyKitContext`) derives wager state from `roomState`:

- `wagerStatus` / `wagerAmount` — from `roomState`
- `wagerPayout` — from `wager_payout` message (happy path)
- `wagerDisputed` — from `wager_dispute` message (sad path)

### Result Screen

Gamba: client waits for server response before showing result.
Regular multiplayer: result shows immediately on `battleOver`.

## Files

```
lib/stackcoin.ts                          # SDK client, helpers, gateway
instrumentation.ts                        # Starts gateway on server boot
app/api/stackcoin/balance/route.ts        # Fetch balance
app/api/stackcoin/wager/create/route.ts   # Create payment requests
app/api/stackcoin/wager/payout/route.ts   # Pay winner
app/api/stackcoin/wager/refund/route.ts   # Refund players
partykit/server.ts                        # Wager state machine + onRequest handler
contexts/PartyKitContext.tsx              # Client wager state
```
