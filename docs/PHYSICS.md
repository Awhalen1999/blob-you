# Blob Battle Physics System

A simple physics engine where **shape matters**. Draw your blob, then watch it battle.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DRAWING          PHYSICS BODY         BATTLE                  │
│   ────────         ────────────         ──────                  │
│                                                                 │
│   Player draws  →  Strokes become  →  Blobs bounce around       │
│   on canvas        Matter.js body      and collide              │
│                                                                 │
│   Ink = 100        Stats calculated:   Damage = f(speed,        │
│   Time = 30s       • Mass (area)         mass, sharpness)       │
│                    • Damage (corners)                           │
│                    • HP (ink + area)   First to 0 HP loses      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stats Overview

| Stat | Based On | Effect |
|------|----------|--------|
| **Mass** | Shape area | Heavier = more collision damage |
| **Damage** | Sharp corners | More spikes = damage multiplier |
| **HP** | Ink used + area | Bigger drawing = more health |
| **Stability** | Symmetry | (Reserved for future use) |

---

## The Tradeoff

```
TANKY BLOB                         GLASS CANNON
───────────                        ────────────

    ████████                           ╲  ╱
   ██████████                           ╲╱
   ██████████         vs                ╱╲
    ████████                           ╱  ╲

• High HP                          • Low HP
• Low damage                       • High damage multiplier
• More mass                        • Sharp corners hurt!
```

**Round shapes** survive longer. **Spiky shapes** deal more damage per hit.

---

## File Structure

```
lib/physics/
├── constants.ts      # All tunable values (change game feel here)
├── geometry.ts       # Pure math: area, angles, hull, simplify
├── calculateStats.ts # Converts body → stats
├── createBlob.ts     # Converts strokes → Matter.js body
├── combat.ts         # Collision damage + arena walls
└── index.ts          # Clean exports
```

---

## Constants (Tuning Knobs)

```typescript
// lib/physics/constants.ts

PHYSICS = {
  INITIAL_SPEED: 5,        // Blob movement speed (constant)
  BLOB_SCALE: 0.5,         // Drawing → arena size ratio
}

STATS = {
  // Mass
  MASS_MULTIPLIER: 0.0008, // area × this = mass
  
  // Sharpness
  SHARP_ANGLE_THRESHOLD: 90,   // Angles < 90° = sharp corner
  SPIKE_ANGLE_THRESHOLD: 60,   // Angles < 60° = spike (bonus damage)
  DAMAGE_PER_SHARP: 3,
  DAMAGE_PER_SPIKE: 5,
  
  // HP
  BASE_HP: 50,
  HP_PER_INK: 0.5,
  HP_PER_AREA: 0.02,
}

COMBAT = {
  VELOCITY_FACTOR: 0.3,    // Speed → damage
  MASS_FACTOR: 0.08,       // Mass → damage  
  SHARPNESS_FACTOR: 0.25,  // Sharpness → damage multiplier
}
```

---

## Damage Formula

```
damage = (speed × 0.3 + mass × 0.08) × (1 + sharpness × 0.25)
         ─────────────────────────────   ─────────────────────
                 base damage                  multiplier
```

Example:
- Speed: 5, Mass: 20, Sharpness (damage stat): 15
- Base = (5 × 0.3) + (20 × 0.08) = 1.5 + 1.6 = 3.1
- Multiplier = 1 + (15 × 0.25) = 4.75
- **Total = 3.1 × 4.75 ≈ 15 damage**

---

## Battle Flow

```typescript
// 1. Create blobs from strokes
const playerBlob = createBlobBody(myStrokes, { x, y, scale: 0.5 });

// 2. Launch them at each other
Matter.Body.setVelocity(playerBlob.body, { x: 5, y: 0 });

// 3. Keep speed constant (like Pong)
Matter.Events.on(engine, 'afterUpdate', () => {
  normalizeSpeed(playerBlob.body, 5);  // Always speed 5
  normalizeSpeed(opponentBlob.body, 5);
});

// 4. On collision, both take damage
Matter.Events.on(engine, 'collisionStart', (event) => {
  // Player damages opponent based on player's stats
  // Opponent damages player based on opponent's stats
});

// 5. First to 0 HP loses
```

---

## Key Functions

### `calculateBlobStats(body, strokes) → BlobStats`

Analyzes a Matter.js body to determine:
- **Mass**: Area of convex hull (Shoelace formula)
- **Damage**: Count corners with angles < 90° and < 60°
- **HP**: Base + ink used + area bonus
- **Stability**: How symmetric the shape is

### `createBlobBody(strokes, options) → BlobBody`

Converts player drawing to physics body:
1. Merge all stroke points
2. Simplify path (Douglas-Peucker)
3. Create convex hull (Graham scan)
4. Scale and center
5. Create Matter.js body
6. Calculate stats

### `calculateCollisionDamage(attacker, attackerStats, defender) → number`

Calculates damage on collision:
1. Get relative velocity between bodies
2. If too slow, no damage
3. Calculate base damage from speed + mass
4. Apply sharpness multiplier
5. Return rounded damage

---

## Geometry Helpers

| Function | What it does |
|----------|--------------|
| `calculateArea(points)` | Shoelace formula for polygon area |
| `countSharpCorners(points, threshold)` | Count angles below threshold |
| `simplifyPath(points, tolerance)` | Douglas-Peucker path reduction |
| `convexHull(points)` | Graham scan for outer boundary |
| `calculateSymmetry(points)` | Distance variance from centroid |

---

## That's It

Simple system:
1. **Draw** → strokes stored as points
2. **Convert** → strokes become physics body
3. **Calculate** → body shape determines stats
4. **Battle** → constant speed, bounce off walls
5. **Damage** → on collision, both take hits
6. **Win** → reduce opponent HP to 0

Shape matters. Sharp hurts. Big survives.

