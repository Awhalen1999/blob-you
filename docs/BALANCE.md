# Game Balance

Shape = strategy. Simple as that.

## The Tradeoff

```
BIG ROUND BLOB          SMALL SPIKY BLOB
──────────────          ────────────────
High HP (tank)          Low HP (fragile)
Low damage              High damage
Survives hits           Dies fast, kills fast
```

## How Stats Work

| Stat | Comes From | Formula |
|------|------------|---------|
| **HP** | Mass (area) | `mass × 5` (min 100) |
| **Damage** | Sharp corners | `5 + corners × 3 + spikes × 5` |

That's it. No complex formulas. Bigger = more HP. Spikier = more damage.

## Example Builds

| Build | Mass | HP | Sharp Corners | Damage |
|-------|------|-----|---------------|--------|
| 🛡️ Tank (big circle) | 50 | 250 | 0 | 5 |
| ⚖️ Balanced (medium blob) | 25 | 125 | 5 | 20 |
| ⚔️ Glass Cannon (small star) | 10 | 100 | 8 | 29+ |

## The Math

**Tank vs Glass Cannon:**
- Tank (250 HP, 5 dmg) needs 20 hits to kill glass cannon
- Glass cannon (100 HP, 29 dmg) needs 4 hits to kill tank

Glass cannon wins if they can land 4 hits before taking 20. The skill becomes avoiding hits while landing your own.

## Why It Works

1. **Sharp shapes naturally have less area** — spikes are narrow
2. **You can't have both** — drawing a big spiky blob uses more ink than you have
3. **Both strategies are valid** — depends on your playstyle
4. **Power-ups add variance** — heals help tanks, damage helps glass cannons

## Tuning

All values in `lib/physics/constants.ts`:

```typescript
STATS = {
  HP_PER_MASS: 5,      // HP = mass × this
  HP_MIN: 100,         // Minimum HP (tiny blobs still get 100)
  BASE_DAMAGE: 5,      // Everyone does at least 5
  DAMAGE_PER_SHARP: 3, // Per corner < 90°
  DAMAGE_PER_SPIKE: 5, // Per corner < 60°
}
```
