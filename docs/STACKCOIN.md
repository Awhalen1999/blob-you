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

## Wager Flow

```
Host proposes amount → Guest accepts
       ↓
Bot DMs both players for payment (label: "accept within 5 min")
       ↓
Server polls every 5s until both accept → status: confirmed
       ↓
Battle runs → both clients report winner
       ↓
Agreement → payout winner       Dispute → refund both
```

## Safety / Edge Cases

| Scenario | Handled? | How |
|---|---|---|
| Player leaves during `pending_payment` | ✅ | `onClose` awaits `issueRefundAndReset()` — checks who paid, refunds only them |
| Player leaves mid-battle (`confirmed`) | ✅ | Same `onClose` guard — refunds both |
| Nobody accepts DM for 5 min | ✅ | Poll timeout (60 polls × 5s) → `issueRefundAndReset()` |
| Payout API fails (non-200 or throws) | ✅ | `issueRefundAndReset()` called — refunds both |
| Dispute (clients report different winners) | ✅ | Broadcast `wager_dispute` → `issueRefundAndReset()` |
| Player leaves after payout succeeds | ✅ | `wagerStatus = 'complete'` — `onClose` skips refund correctly |
| Client reports winner after opponent left | ✅ | `opponentLeft` guard on `sendReportWinner` prevents stale report |
| Wager create API fails (user not on STK) | ✅ | `resetWager()` — no coins moved yet |
| Guest declines wager | ✅ | `resetWager()` — no coins moved |
| Tie outcome | ✅ | `payoutWager('tie')` sends `amount` back to each player |

## Core Rule

> If anything goes wrong after coins are taken — disconnect, timeout, payout failure, dispute — refund whoever already paid. `wagerStatus = 'complete'` is only set after a confirmed 200 payout response.

All paths route through `issueRefundAndReset()` in `partykit/server.ts`.
