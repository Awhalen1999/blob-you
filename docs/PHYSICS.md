# Physics System

Draw a blob. Watch it fight. Shape determines stats.

## Quick Overview

```
You Draw  →  We Calculate  →  Blobs Battle
─────────    ─────────────    ────────────
Strokes      Mass, Damage,    Constant speed,
on canvas    HP from shape    bounce off walls
```

## How Stats Work

| Stat | Comes From | Effect |
|------|------------|--------|
| **Mass** | Shape area | Heavier = more base damage |
| **Damage** | Sharp corners | Spiky = damage multiplier |
| **HP** | Area + ink used | Bigger drawing = more health |

## The Tradeoff

```
BIG ROUND BLOB              SMALL SPIKY BLOB
──────────────              ────────────────
High HP (200)               Low HP (30)
Low damage (~12/hit)        High damage (~47/hit)
Survives mistakes           Dies fast, kills fast
```

Both are viable. No single "best" shape.

## Damage Formula

```
damage = (speed × 0.3 + mass × 0.08) × (1 + sharpness × 0.25)
```

Speed is constant (5), so mass and sharpness are what matter.

## Key Values

```typescript
// lib/physics/constants.ts

PHYSICS = {
  INITIAL_SPEED: 5,      // Blobs always move at speed 5
  BLOB_SCALE: 0.5,       // Drawing shrinks 50% in arena
}

STATS = {
  BASE_HP: 50,           // Everyone starts with at least 50
  HP_MIN: 30,            // Minimum HP (tiny shapes)
  HP_MAX: 200,           // Maximum HP (huge shapes)
  SHARP_ANGLE_THRESHOLD: 90,  // Corners < 90° count as "sharp"
}

COMBAT = {
  MIN_IMPACT_VELOCITY: 2,     // Below this, no damage
  SHARPNESS_FACTOR: 0.25,     // How much sharpness multiplies damage
}
```

## Battle Flow

1. **Draw** → Player draws strokes (ink limit: 100)
2. **Convert** → Strokes become a physics body
3. **Calculate** → Shape determines mass, damage, HP
4. **Launch** → Blobs start on opposite sides
5. **Bounce** → Constant speed, bounce off walls
6. **Collide** → Both blobs take damage on impact
7. **Win** → First to 0 HP loses

## Power-Ups

Spawn when any blob drops below HP thresholds (160, 120, 80, 40):

| Power-Up | Effect |
|----------|--------|
| 💀 Damage | 2× damage multiplier |
| 💚 Heal | +20 HP instantly |
| 🛡️ Shield | Block next hit |
| ⚡ Regen | Heal on wall bounces |

## Files

```
lib/physics/
├── constants.ts      # All tunable values
├── createBlob.ts     # Strokes → physics body
├── calculateStats.ts # Body → stats
├── combat.ts         # Damage calculation
└── geometry.ts       # Math helpers
```

## That's It

Draw. Stats calculated from shape. Blobs bounce and fight. First to 0 HP loses.
