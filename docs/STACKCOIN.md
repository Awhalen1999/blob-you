# StackCoin Integration

Handles in-game wagering via the StackCoin economy. Only available to Discord users with a StackCoin account.

## Env Vars

```
STACKCOIN_API_URL=https://stackcoin.world
STACKCOIN_BOT_TOKEN=<bot token>
```

## API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/users?discord_id={id}` | Look up user by Discord ID → get `id` and `balance` |
| `POST` | `/api/user/{id}/request` | Send DM payment request to user → returns `request_id` |
| `GET` | `/api/request/{id}` | Check if a payment request was accepted |
| `POST` | `/api/user/{id}/send` | Send coins to a user (payout + refunds) |

## Next.js Routes

| Route | Purpose |
|---|---|
| `GET /api/stackcoin/balance` | Fetch user balance |
| `POST /api/stackcoin/wager/create` | Create payment requests for both players |
| `GET /api/stackcoin/wager/status` | Poll whether each player accepted their DM |
| `POST /api/stackcoin/wager/payout` | Pay winner `amount * 2` (or refund each on tie) |
| `POST /api/stackcoin/wager/refund` | Partial refund — only refunds players who already paid |

## Two Modes

### Regular Multiplayer

Local-only result. Each client runs the physics sim, shows VICTORY/DEFEAT when battle ends. No server coordination for result. Rematch available.

### Gamba (Wager Active)

Server-authoritative result. Both clients report their sim result. Server decides outcome. Client does NOT show the result screen until the server responds.

## Two Outcomes (Gamba)

Every wager resolves to exactly one of two outcomes. There is no third path.

### Happy Path: Payout

```
propose → accept → both pay DM → battle → clients agree → payout 200 → complete
```

The winner receives `amount * 2`. On tie, each player gets `amount` back. `wagerStatus` becomes `complete` **only** after a confirmed 200 from the payout API.

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

Failures before coins move (no refund needed, just reset):
- Guest declines proposal
- Wager create API fails (user not on STK)

### The Rule

> Once `wagerStatus` leaves `none`, it either reaches `complete` (payout succeeded) or gets refunded and reset back to `none`. No wager is ever left in a dangling state.

## State Machine

```
none → proposed → pending_payment → confirmed → complete
                                                   ↑
                                            (payout 200 only)
```

Every state except `complete` can transition back to `none` via refund+reset.

`complete` is terminal — coins are settled, no refund runs.

## Server Architecture

All wager logic lives in `partykit/server.ts`. The server owns:

- **Wager state** (`wagerStatus`, `wagerAmount`) — synced to clients via `RoomState`
- **Private escrow state** (discord IDs, request IDs, reported winners) — server only
- **Two resolution functions:**
  - `payoutWager(winner)` — happy path. Calls payout API. On 200: set `complete`. On failure: fall through to refund.
  - `issueRefundAndReset()` — sad path. Checks who paid, refunds them, resets all wager state.
- **One cleanup function:**
  - `resetWager()` — clears all wager state (status, amount, request IDs, reported winners, timers). Used by both resolution functions and by pre-payment failures.

### Race Protection

Both resolution functions have stale-state guards:
- `issueRefundAndReset()` bails if `wagerStatus` is `none` or `complete`
- `payoutWager()` bails after `await fetch` if `wagerStatus` is no longer `confirmed`

Whichever resolution runs first wins. The other sees the changed status and bails. No double-payout, no double-refund.

### Timeouts

- **DM payment timeout:** 5 min (60 polls x 5s). If both players don't accept the StackCoin DM, refund whoever paid.
- **Battle report timeout:** 3 min after `battle_start`. If both clients don't report a winner, refund both. Covers backgrounded tabs and stalled sims.

### `onClose` guard

```
if wagerStatus is active (not 'none', not 'complete'):
  await issueRefundAndReset()
```

Covers every disconnect scenario. The `await` ensures the refund API call completes before state is wiped.

## Client Architecture

The client (`PartyKitContext`) derives wager state from `roomState` (single source of truth):

- `wagerStatus` / `wagerAmount` — derived from `roomState.wagerStatus` / `roomState.wagerAmount`
- `wagerPayout` — set from `wager_payout` message (happy path outcome)
- `wagerDisputed` — set from `wager_dispute` message (sad path outcome)

### Gamba Result Screen

The client does not show the battle result for gamba until the server responds:

1. Battle ends locally → `report_winner` sent → "Settling wager..." overlay shown
2. Server responds with `wager_payout` → result screen shown using server's winner
3. Server responds with `wager_dispute` → result screen shown with "Wager cancelled — coins refunded"

Regular multiplayer shows the result immediately on `battleOver` — no server involvement.
