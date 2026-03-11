# Physics System

Draw a blob. Watch it fight. Shape determines stats.

## Overview

```
You Draw  →  We Calculate  →  Blobs Battle
─────────    ─────────────    ────────────
Strokes      HP from mass     Constant speed,
on canvas    Damage from      bounce off walls
             sharpness
```

## Stats

| Stat | Comes from | Formula |
|---|---|---|
| **HP** | Mass (shape area) | `mass * 5` (min 100) |
| **Damage** | Sharp corners | `5 + corners * 3 + spikes * 5` |

Big blob = tank. Spiky blob = glass cannon.

## The Tradeoff

```
BIG ROUND BLOB              SMALL SPIKY BLOB
──────────────              ────────────────
High HP (~250)              Low HP (~100)
Low damage (5/hit)          High damage (30+/hit)
Survives mistakes           Dies fast, kills fast
```

Both are viable. No single "best" shape.

## Damage

```
damage_per_hit = attacker's sharpness stat
```

No velocity scaling, no mass factor. Simple = predictable strategy.

## Constants

```typescript
// lib/constants.ts
PHYSICS = {
  INITIAL_SPEED: 5,      // Blobs always move at speed 5
  BLOB_SCALE: 0.5,       // Drawing shrinks 50% in arena
}

STATS = {
  HP_PER_MASS: 5,        // HP = mass * 5
  HP_MIN: 100,           // Minimum HP
  BASE_DAMAGE: 5,        // Everyone does at least 5
  SHARP_ANGLE_THRESHOLD: 90,  // Corners < 90deg = sharp
  SPIKE_ANGLE_THRESHOLD: 60,  // Corners < 60deg = spike (bonus)
}
```

## Battle Flow

1. **Draw** — Player draws strokes (ink limit: 100)
2. **Convert** — Strokes become a physics body
3. **Calculate** — Shape determines mass → HP, corners → damage
4. **Launch** — Blobs start on opposite sides
5. **Bounce** — Constant speed, bounce off walls
6. **Collide** — Both blobs take damage on impact
7. **Win** — First to 0 HP loses

## Power-Ups

Spawn when any blob drops below HP thresholds.

| Power-Up | Effect |
|---|---|
| Damage | 2x damage multiplier |
| Heal | +20 HP instantly |
| Shield | Block next hit |
| Regen | Heal on wall bounces |

## Files

```
lib/physics/
├── constants.ts      # All tunable values
├── createBlob.ts     # Strokes → physics body
├── calculateStats.ts # Body → stats (HP, damage)
├── combat.ts         # Collision → damage
└── geometry.ts       # Math helpers
```
