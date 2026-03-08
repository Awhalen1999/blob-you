# StackCoin Integration

Handles in-game wagering via the StackCoin economy. Only available to users logged in with Discord who have a StackCoin account.

## API Base

```
https://stackcoin.world
Authorization: Bearer <STACKCOIN_BOT_TOKEN>
```

## Endpoints Used

### Look up user by Discord ID
```
GET /api/users?discord_id={discordId}
→ { users: [{ id, balance, username }] }
```
Used to resolve a Discord ID to a StackCoin user ID before any payment operation.

### Get user balance
```
GET /api/users?discord_id={discordId}
→ { users: [{ balance }] }
```
Same endpoint as above — balance is read from the same response. Called on page load and after each wager settles.

### Create a payment request (bot DMs the user)
```
POST /api/user/{stackcoinUserId}/request
{ amount, label }
→ { request_id }
```
Sends the user a Discord DM asking them to approve a payment. Returns a `request_id` to poll against.

### Check if a payment request was accepted
```
GET /api/request/{requestId}
→ { status: 'pending' | 'accepted' | ... }
```
Polled every 5 seconds (max 60 polls / 5 minutes). Both players must accept before the wager is confirmed.

### Send coins to a user
```
POST /api/user/{stackcoinUserId}/send
{ amount, label }
```
Used for both payout (winner receives `amount * 2`) and refunds (each player gets their stake back).

## Wager Flow

```
Host proposes amount
       ↓
Guest accepts → both get Discord DM payment requests
       ↓
Poll until both accept (max 5 min)
       ↓
Battle runs — both clients report winner
       ↓
Agreement → payout to winner
Dispute    → refund both (safety net, shouldn't happen)
```

## Next.js API Routes

| Route | Purpose |
|---|---|
| `GET /api/stackcoin/balance` | Fetch user balance by Discord ID |
| `POST /api/stackcoin/wager/create` | Look up both users, create payment requests for both |
| `GET /api/stackcoin/wager/status` | Check if each payment request was accepted |
| `POST /api/stackcoin/wager/payout` | Send winnings to winner (or refund each on tie) |
| `POST /api/stackcoin/wager/refund` | Partial refund — only pays back players who already accepted |

## Safety

If anything goes wrong after coins are taken (disconnect, timeout, payout failure), the server calls the refund route for whoever already paid. See `issueRefundAndReset()` in `partykit/server.ts`.

Payment request labels include `(accept within 5 min)` to warn users the window is limited.

## Env Vars

```
STACKCOIN_API_URL=https://stackcoin.world
STACKCOIN_BOT_TOKEN=<bot token>
```
