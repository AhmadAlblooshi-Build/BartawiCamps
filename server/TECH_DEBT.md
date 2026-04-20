# Technical Debt

## UUID Version Inconsistency

**Issue:** Seed data uses non-v4 UUIDs (e.g., Camp 2 ID `1af2c34d-6c38-1b45-277f-072f900acbc1` has version byte `1` instead of `4`). New records created by Prisma `@default(uuid())` generate proper v4 UUIDs.

**Impact:** Mix of UUID versions in database. No functional issue, but inconsistent.

**Current Mitigation:** API validators use version-agnostic UUID regex instead of strict v4 validation.

**Long-term Options:**
- **Option A:** Migrate old UUIDs to v4 format (risky — breaks all FK references)
- **Option B:** Accept mixed versions (current approach, low risk)
- **Option C:** Use CUID for new tables (requires schema change)

**Decision:** Accept mixed versions. Version-agnostic validation handles both.

**Location:** All route validators use regex pattern:
```js
z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID format'
)
```

**Date Filed:** 2026-04-20
**Filed By:** Phase 4B implementation
