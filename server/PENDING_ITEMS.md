# Pending Items - Bartawi CMS Backend

**Last Updated:** April 16, 2026

This document tracks items that require external input or business decisions before completion.

---

## ⚠️ CRITICAL - Requires Action

### 1. Camp 1 Yearly Contracts Data (Migration 012)

**Status:** Schema ready, data pending

**Impact:** 6 Camp 1 yearly contracts worth ~AED 345,000/year are NOT tracked in the contract alert system

**Required Action:**
Obtain actual contract start/end dates from operations team for the following rooms:

| Room | Tenant Name | Monthly Rent | Contract Type |
|------|-------------|--------------|---------------|
| A12 | Al Junaibi/Hartoshi Cont | AED 2,700 | Yearly |
| A14 | Al Quraidi Contracting | AED 2,700 | Yearly |
| A21 | Al Quraidi Contracting | AED 2,500 | Yearly |
| A30 | Senan Alabadi Cont | AED 2,700 | Yearly |
| A31 | Al Tannoor Center Cont | AED 2,700 | Yearly |
| A38 | Al Tannoor Center Cont | AED 2,700 | Yearly |

**Total:** ~AED 16,200/month × 12 = ~AED 194,400/year (6 contracts)

**How to Complete:**

1. Contact operations team to obtain actual contract dates
2. Update `migrations/012_camp1_yearly_contracts.sql` with real dates (replace `2025-XX-XX` and `2026-XX-XX`)
3. Run the migration:
   ```bash
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/012_camp1_yearly_contracts.sql
   ```

**Why Important:**
- Contract expiry alerts won't fire for these 6 contracts until data is populated
- Revenue tracking incomplete (~AED 194K/year not monitored)
- Compliance risk if yearly contracts expire without renewal

**Assigned To:** Operations Manager + Tech Lead

**Deadline:** Before production deployment

---

## 📋 BUSINESS DECISIONS REQUIRED

### 2. Proration Policy (Section 4.6 of Audit)

**Status:** Not implemented (intentional)

**Current Behavior:** Monthly records always created with full `monthly_rent` regardless of check-in date

**Options:**
- **Option A:** Implement automatic proration (check-in mid-month = prorated rent)
  - Pros: Accurate accounting, fair to tenants
  - Cons: Requires clear policy on calculation method

- **Option B:** Manual entry in `off_days` field
  - Pros: Flexible, allows custom adjustments
  - Cons: Requires training, prone to human error

- **Option C:** No proration (current state)
  - Pros: Simple, consistent
  - Cons: Doesn't match Excel workflow (manual calculations required)

**Required Decision:** CEO/Finance approval on preferred option

**Assigned To:** CEO + Finance Manager

**Deadline:** Q2 2026

---

### 3. Company Deduplication Review (Migration 006)

**Status:** Migration executed automatically, review pending

**Action Taken:** Migration 006 merged 30 duplicate company records:
- Before: 79 companies
- After: ~49 unique entities
- Method: Automated fuzzy matching on normalized names

**Required Action:** CEO/Ops review and approval of the deduplication mappings

**Why Important:** Ensure no legitimate separate entities were incorrectly merged

**Assigned To:** CEO + Operations Manager

**Deadline:** Within 2 weeks of deployment

---

## 🔮 FUTURE ENHANCEMENTS

### 4. AI Features (Section 9 of Audit)

**Status:** Infrastructure ready, features not implemented

**Available:**
- ✅ @anthropic-ai/sdk installed
- ✅ `server/src/lib/ai.js` skeleton created
- ✅ ANTHROPIC_API_KEY in .env.example

**Not Implemented:**
- ❌ LLM-powered complaint classification (9.1)
- ❌ Anomaly narrator on dashboard (9.2)
- ❌ Tenant/company fuzzy match on check-in (9.3)
- ❌ Remarks column parser (9.4)

**Recommendation:** Implement 9.2 (Anomaly Narrator) first
- Easiest to implement (~2 hours)
- Highest visibility (dashboard feature)
- Great demo value

**Assigned To:** AI Engineer

**Deadline:** v1.1 release (May 2026)

---

### 5. Multi-Product Architecture (Section 8.1-8.3 of Audit)

**Status:** Deferred to v2.0

**Items:**
- Shared authentication service (OAuth2 provider)
- Shared design system package
- "Mother product" contract architecture

**Reason:** Product #1 focus on CRUD operations first

**Assigned To:** CTO + Tech Lead

**Deadline:** Before Product #2 development starts (Q3 2026)

---

## ✅ COMPLETED BUT REQUIRES VERIFICATION

### 6. Decimal.js Financial Math Verification

**Status:** Implemented, needs testing

**What Was Done:**
- All financial calculations in `reports.js` now use `Decimal.js`
- Prevents floating-point rounding errors

**Required Action:**
- Compare March 2026 report totals against Excel
- Verify AED amounts match exactly (no 0.01 cent differences)

**Assigned To:** QA Team

**Deadline:** Before production deployment

---

### 7. Multi-Tenant Smoke Test

**Status:** Code complete, needs testing

**What Was Done:**
- All routes scoped by `req.tenantId`
- No hardcoded `slug: 'bartawi'` references
- Feature flags per tenant

**Required Action:**
- Create second test tenant in database
- Create test user for second tenant
- Verify data isolation (tenant A can't see tenant B data)

**Assigned To:** QA Team

**Deadline:** Before production deployment

---

## 📊 SUMMARY

| Category | Item | Status | Blocker | Deadline |
|----------|------|--------|---------|----------|
| **Critical** | Camp 1 Contracts Data | ⏳ Pending | Ops input | Pre-deployment |
| **Business** | Proration Policy | ⏳ Pending | CEO decision | Q2 2026 |
| **Business** | Company Dedup Review | ⏳ Pending | CEO approval | 2 weeks |
| **Future** | AI Features | 📦 Backlog | None | v1.1 (May 2026) |
| **Future** | Multi-Product Arch | 📦 Backlog | None | Q3 2026 |
| **Testing** | Decimal Verification | ✅ Code Done | QA testing | Pre-deployment |
| **Testing** | Multi-Tenant Test | ✅ Code Done | QA testing | Pre-deployment |

---

## 🚀 NEXT ACTIONS

**Immediate (This Week):**
1. ✅ Obtain Camp 1 contract dates from ops team
2. ✅ Complete migration 012 data population
3. ✅ Run Decimal.js verification test
4. ✅ Run multi-tenant smoke test

**Short-term (2 Weeks):**
1. CEO review of company deduplication
2. CEO decision on proration policy

**Medium-term (1-2 Months):**
1. Implement AI Anomaly Narrator feature
2. Plan multi-product architecture

---

**Maintained By:** Engineering Team
**Contact:** For updates or questions, create issue in project tracker
