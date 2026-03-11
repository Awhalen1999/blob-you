# Multiplayer System

Real-time battles using WebSockets via PartyKit.

## Architecture

```
┌──────────────┐     WebSocket     ┌──────────────┐
│   Player A   │◄────────────────►│   PartyKit   │
│   (Browser)  │                   │   Server     │
└──────────────┘                   │              │
                                   │  Room State  │
┌──────────────┐                   │  • Players   │
│   Player B   │◄────────────────►│  • Phase     │
│   (Browser)  │     WebSocket     │  • Strokes   │
└──────────────┘                   └──────────────┘
```

## Game Flow

```
1. HOST creates room       → Room code generated (e.g., "ABC123")
2. GUEST joins room        → Both players see each other
3. Both click READY        → Drawing phase starts
4. Both submit strokes     → Battle starts with shared seed
5. Battle ends             → Winner declared
6. Rematch or leave        → Either leaves = room closes
```

## Room Phases

```typescript
phase: 'waiting' | 'drawing' | 'fighting'
```

| Phase | What's happening |
|---|---|
| `waiting` | In lobby, waiting for ready clicks |
| `drawing` | Both drawing their blobs |
| `fighting` | Physics simulation running |

## Message Types

### Client → Server

| Message | When |
|---|---|
| `join` | Player connects to room |
| `lobby_ready` | Player clicks Ready in lobby |
| `lobby_unready` | Player clicks Unready |
| `ready` | Player submits strokes after drawing |
| `rematch_request` | Player wants to play again |
| `propose_wager` | Host proposes a STK wager |
| `accept_wager` | Guest accepts the wager |
| `decline_wager` | Guest declines the wager |
| `report_winner` | Client reports battle result (gamba only) |

### Server → Client

| Message | When |
|---|---|
| `welcome` | Connection established, role assigned |
| `player_joined` | Other player connected |
| `player_left` | Other player disconnected |
| `drawing_start` | Both ready, start drawing |
| `battle_start` | Both submitted, start fighting |
| `rematch_start` | Both agreed to rematch |
| `wager_status` | Wager state changed |
| `wager_payout` | Wager settled, winner paid |
| `wager_dispute` | Players disagreed, coins refunded |

### Server ← HTTP (Gateway Push)

| Message | When |
|---|---|
| `request_accepted` | A player accepted their StackCoin DM payment |

The PartyKit server exposes an `onRequest()` HTTP handler that receives push notifications from the StackCoin gateway running in Next.js.

## Deterministic Physics

Both clients run the same physics simulation. Synchronized via:

1. **Shared seed** — Server sends random seed with `battle_start`
2. **Same strokes** — Server sends both players' strokes
3. **Fixed timestep** — Physics runs at exactly 60fps
4. **Seeded RNG** — Power-up spawns use deterministic random

No server-side physics. Clients simulate identically.

## Connection Handling

| Event | What happens |
|---|---|
| Player disconnects | Other player sent to main menu |
| Room empty | Auto-closes (PartyKit handles this) |
| Connection error | UI shows error, can retry |
| Disconnect during wager | Whoever paid gets refunded |

## Files

```
partykit/
├── server.ts              # Server logic (runs on Cloudflare)
└── types.ts               # Message type definitions

contexts/
└── PartyKitContext.tsx     # Client connection manager

store/
└── gameStore.ts           # Local game state (Zustand)
```

## Local Development

```bash
# Terminal 1: Next.js
pnpm dev

# Terminal 2: PartyKit
pnpm dev:partykit

# Or both
pnpm dev:all
```

## Production

```bash
npx partykit deploy
NEXT_PUBLIC_PARTYKIT_HOST=your-app.username.partykit.dev
```
