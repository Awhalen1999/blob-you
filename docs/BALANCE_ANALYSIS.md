# Balance Analysis: Tank vs Glass Cannon

## Current Damage Formula

```
damage = (speed × 0.3 + mass × 0.08) × (1 + damage_stat × 0.25)
```

Speed is constant at 5, so:
```
damage = (1.5 + mass × 0.08) × (1 + damage_stat × 0.25)
```

---

## Extreme Builds

### 🛡️ TANK (Fully Round)
- **Shape**: Large circle
- **Area**: ~50,000 (after scaling)
- **Mass**: 50 (capped)
- **Sharp corners**: 0
- **Damage stat**: 5 (BASE_DAMAGE only)
- **HP**: 200 (max)

**Damage per hit:**
- Base = 1.5 + (50 × 0.08) = 5.5
- Multiplier = 1 + (5 × 0.25) = 2.25
- **Total = 5.5 × 2.25 ≈ 12 damage**

**Hits to kill glass cannon (30 HP):** 3 hits

---

### ⚔️ GLASS CANNON (Fully Sharp)
- **Shape**: Small spiky star/spikeball
- **Area**: ~2,000 (smaller = less HP)
- **Mass**: 1 (min)
- **Sharp corners**: 20 sharp + 10 spikes
- **Damage stat**: 5 + (20 × 3) + (10 × 5) = **115**
- **HP**: 30 (min)

**Damage per hit:**
- Base = 1.5 + (1 × 0.08) = 1.58
- Multiplier = 1 + (115 × 0.25) = **29.75**
- **Total = 1.58 × 29.75 ≈ 47 damage**

**Hits to kill tank (200 HP):** 5 hits

---

## The Problem

**Glass cannon wins 5-3** - it kills faster!

This is actually **balanced** because:
1. Glass cannon is **fragile** (30 HP vs 200 HP)
2. Tank can **survive mistakes** (miss a hit? Still alive)
3. Glass cannon is **high risk** (one bad bounce = dead)

But there's a **meta issue**: if glass cannon always wins in a straight fight, why would anyone play tank?

---

## Potential Balance Issues

### Issue 1: Sharpness Multiplier Too Strong
At 0.25, a damage stat of 115 gives a 29.75x multiplier. That's huge.

**Current:** `1 + (115 × 0.25) = 29.75x`

**If we lower to 0.15:** `1 + (115 × 0.15) = 18.25x`
- Glass cannon damage: 1.58 × 18.25 ≈ **29 damage**
- Hits to kill tank: 7 hits
- **Tank wins 3-7** ❌ (tank too strong)

**If we lower to 0.20:** `1 + (115 × 0.20) = 24x`
- Glass cannon damage: 1.58 × 24 ≈ **38 damage**
- Hits to kill tank: 6 hits
- **Glass cannon still wins 3-6** ⚠️

### Issue 2: HP Range Too Wide
- Tank: 200 HP
- Glass cannon: 30 HP
- Ratio: **6.67:1**

This means glass cannon needs to hit **6.67x more** to win, but it only deals **3.9x more damage** (47 vs 12).

**Math check:**
- Tank needs: 30 HP ÷ 12 damage = 2.5 hits (rounds to 3)
- Glass cannon needs: 200 HP ÷ 47 damage = 4.26 hits (rounds to 5)
- **Glass cannon wins 3-5** ✅ (close!)

---

## Recommendation

The current balance is **actually pretty good**! Here's why:

1. **Glass cannon wins in perfect play** (5 hits vs 3)
2. **But tank has 6.67x more HP** - can survive mistakes
3. **Real games aren't perfect** - tank's durability matters

However, if glass cannon is **too dominant**, consider:

### Option A: Lower Sharpness Factor
```typescript
SHARPNESS_FACTOR: 0.20  // Down from 0.25
```
- Glass cannon: 38 damage/hit → 6 hits to kill tank
- Tank: 12 damage/hit → 3 hits to kill glass cannon
- **Result: Tank wins 3-6** (tank favored)

### Option B: Narrow HP Range
```typescript
HP_MIN: 50,   // Up from 30
HP_MAX: 150,  // Down from 200
```
- Ratio: 3:1 instead of 6.67:1
- Glass cannon: 50 HP, needs 5 hits from tank
- Tank: 150 HP, needs 4 hits from glass cannon
- **Result: Glass cannon wins 4-5** (very close!)

### Option C: Add Mass to Base Damage
```typescript
MASS_FACTOR: 0.12  // Up from 0.08
```
- Tank base damage: 1.5 + (50 × 0.12) = 7.5
- Tank total: 7.5 × 2.25 = **17 damage**
- **Tank wins 2-5** (tank too strong)

---

## Current Verdict

**The balance is close!** Glass cannon wins in theory, but:
- Tank's durability = more room for error
- Real physics = unpredictable bounces
- Skill matters = positioning, timing

**No single meta build dominates** - both are viable! 🎮

