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

## Two Outcomes

Every wager resolves to exactly one of two outcomes. There is no third path.

### Happy Path: Payout

Both players pay in, battle completes, both clients agree on a winner, payout API returns 200.

```
propose → accept → both pay DM → battle → clients agree → payout 200 → complete
```

The winner receives `amount * 2`. On tie, each player gets `amount` back. `wagerStatus` becomes `complete` **only** after a confirmed 200 from the payout API. This is the single gate that marks coins as settled.

### Sad Path: Refund

Anything else. Any failure after coins are taken triggers a refund to whoever already paid.

```
[any failure] → refund whoever paid → reset
```

Failures that trigger refund:
- Player disconnects (any phase after proposal)
- DM payment timeout (5 min)
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
  - `resetWager()` — clears all wager state (status, amount, request IDs, reported winners). Used by both resolution functions and by pre-payment failures.

### `onClose` guard

```
if wagerStatus is active (not 'none', not 'complete'):
  await issueRefundAndReset()
```

This single guard covers every disconnect scenario. The `await` ensures the refund API call completes before the room state is wiped.

## Client Architecture

The client (`PartyKitContext`) holds wager state derived from server messages:

- `wagerStatus` / `wagerAmount` — set from `wager_status` messages
- `wagerPayout` — set from `wager_payout` message (happy path)
- `wagerDisputed` — set from `wager_dispute` message (sad path, dispute variant)

The client never decides outcomes. It sends `report_winner` after battle, and the server decides whether to pay out or refund based on agreement.
