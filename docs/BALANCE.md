# Game Balance

Two extreme builds. Both can win.

## Tank vs Glass Cannon

| Build | HP | Damage/Hit | Hits to Kill Other |
|-------|-----|------------|-------------------|
| 🛡️ Tank (round) | 200 | ~12 | 3 hits |
| ⚔️ Glass Cannon (spiky) | 30 | ~47 | 5 hits |

**Result**: Glass cannon wins in perfect play (3 hits vs 5).

**But**: Tank survives 6.67× longer. Real games have misses.

## Why It's Balanced

1. **Glass cannon is high risk** — one mistake = dead
2. **Tank forgives errors** — extra HP = safety margin
3. **Physics is unpredictable** — bounces matter
4. **Power-ups shake it up** — can swing either way

## Tuning Knobs

If balance feels off, adjust in `lib/physics/constants.ts`:

```typescript
// Make sharpness less powerful
SHARPNESS_FACTOR: 0.20  // default: 0.25

// Narrow the HP gap
HP_MIN: 50    // default: 30
HP_MAX: 150   // default: 200

// Make mass matter more
MASS_FACTOR: 0.12  // default: 0.08
```

## Current State

Balanced. No dominant meta. Both strategies work.

