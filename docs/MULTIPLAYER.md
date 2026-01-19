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
3. Both click READY        → Drawing phase starts (15s)
4. Both submit strokes     → Battle starts with shared seed
5. Battle ends             → Winner declared
6. Rematch or leave        → Either leaves = room closes
```

## Room States

```typescript
phase: 'waiting' | 'drawing' | 'fighting'
```

| Phase | What's Happening |
|-------|-----------------|
| `waiting` | In lobby, waiting for ready clicks |
| `drawing` | Both drawing their blobs (15s timer) |
| `fighting` | Physics simulation running |

## Message Types

### Client → Server

| Message | When |
|---------|------|
| `join` | Player connects to room |
| `lobby_ready` | Player clicks Ready in lobby |
| `lobby_unready` | Player clicks Unready |
| `ready` | Player submits strokes after drawing |
| `rematch_request` | Player wants to play again |

### Server → Client

| Message | When |
|---------|------|
| `welcome` | Connection established, role assigned |
| `player_joined` | Other player connected |
| `player_left` | Other player disconnected |
| `drawing_start` | Both ready, start drawing |
| `battle_start` | Both submitted, start fighting |
| `rematch_start` | Both agreed to rematch |

## Deterministic Physics

Both clients run the same physics simulation. Synchronized via:

1. **Shared seed** — Server sends random seed with `battle_start`
2. **Same strokes** — Server sends both players' strokes
3. **Fixed timestep** — Physics runs at exactly 60fps
4. **Seeded RNG** — Power-up spawns use deterministic random

No server-side physics. Clients simulate identically.

## Key Files

```
partykit/
├── server.ts         # Server logic (runs on Cloudflare)
└── types.ts          # Message type definitions

contexts/
└── PartyKitContext.tsx   # Client connection manager

store/
└── gameStore.ts      # Local game state (Zustand)
```

## Connection Handling

| Event | What Happens |
|-------|--------------|
| Player disconnects | Other player sent to main menu |
| Room empty | Auto-closes (PartyKit handles this) |
| Connection error | UI shows error, can retry |

## Local Development

```bash
# Terminal 1: Next.js app
pnpm dev

# Terminal 2: PartyKit server
pnpm dev:partykit

# Or both at once
pnpm dev:all
```

Connects to `localhost:1999` by default.

## Production Deployment

```bash
# 1. Deploy PartyKit server
npx partykit login
npx partykit deploy

# 2. Set environment variable
NEXT_PUBLIC_PARTYKIT_HOST=your-app.username.partykit.dev

# 3. Deploy Next.js app normally
```

## Monitoring

```bash
# View live logs
npx partykit tail

# Check deployment status
npx partykit info
```

## That's It

- PartyKit handles WebSocket infrastructure
- Server manages room state and broadcasts messages
- Clients run identical physics simulations
- Deterministic seed ensures same battle outcome
- Either player leaving closes the room

