# Bartawi CMS - Quick Start Guide

## What Was Built

✅ **Complete Backend API** with Express + Prisma + PostgreSQL
✅ **Database Deployed** with Docker - 453 rooms + 1,359 financial records
✅ **9 API Endpoints** ready to use
✅ **Multi-tenant architecture** enforced at query level
✅ **Real data** from Excel (Jan-Mar 2026)

---

## Start the System

### 1. Database (Already Running)
```bash
docker-compose up -d
```

**Status:** ✅ PostgreSQL running on port 5432
**Data:** All schema and seed files deployed

### 2. API Server (Already Running)
```bash
cd server
npm run dev
```

**Status:** ✅ Server running on http://localhost:3001
**Environment:** Development mode with hot reload

---

## Test the API

### Health Check
```bash
curl http://localhost:3001/health
```

### Get All Camps
```bash
curl http://localhost:3001/api/camps
```

### Camp 1 Dashboard (Current Month)
```bash
curl http://localhost:3001/api/camps/4c935f2b-23b9-b94c-99ca-cb2ee0620045/dashboard
```

### Camp 1 Buildings with Blocks
```bash
curl http://localhost:3001/api/camps/4c935f2b-23b9-b94c-99ca-cb2ee0620045/buildings
```

### Get All Rooms in Camp 1
```bash
curl http://localhost:3001/api/camps/4c935f2b-23b9-b94c-99ca-cb2ee0620045/rooms
```

### Monthly Records (March 2026, with outstanding balance)
```bash
curl "http://localhost:3001/api/monthly-records?month=3&year=2026&has_balance=true"
```

### Get Single Room Details
```bash
curl http://localhost:3001/api/rooms/bfaa8695-827b-3747-4fff-7549af3251ab
```

---

## Created Data (for Testing)

### Payment Test Data
**Room:** A03 (Camp 2)
**Monthly Record ID:** f02a22ab-cc45-6772-e974-6891b28f5710
**Original Balance:** 3300 AED
**Payment Made:** 1000 AED
**New Balance:** 2300 AED

### Complaint Test Data
**Reference:** CMP-20260415-0001
**Room:** A03 (Camp 2)
**Title:** AC not working properly
**Status:** Open
**Priority:** High

---

## Camp IDs (for API calls)

- **Camp 1:** `4c935f2b-23b9-b94c-99ca-cb2ee0620045`
- **Camp 2:** `1af2c34d-6c38-1b45-277f-072f900acbc1`

---

## Database Quick Access

```bash
# Access PostgreSQL shell
docker exec -it bartawi_postgres psql -U bartawi -d bartawi_cms

# Useful queries
SELECT camp_id, COUNT(*) FROM rooms GROUP BY camp_id;
SELECT month, SUM(rent), SUM(paid), SUM(balance) FROM monthly_records WHERE year=2026 GROUP BY month ORDER BY month;
SELECT * FROM complaints;
```

---

## File Structure

```
Bartawi Camp Managment/
├── docker-compose.yml          # PostgreSQL container
├── schema.sql                  # Complete database schema
├── seed_structure.sql          # Camps, buildings, blocks, rooms
├── seed_entities.sql           # Companies + individuals
├── seed_monthly.sql            # 1,359 monthly records
├── BARTAWI_CMS_DB_COMPLETE.md  # Full architecture documentation
├── README.md                   # Complete API documentation
├── QUICKSTART.md              # This file
│
└── server/
    ├── .env                    # Environment variables
    ├── package.json
    ├── prisma/
    │   └── schema.prisma       # Generated from database
    └── src/
        ├── index.js            # Express server entry
        ├── lib/
        │   └── prisma.js       # Prisma client singleton
        ├── middleware/
        │   └── tenantFilter.js # Multi-tenancy enforcement
        ├── routes/
        │   ├── camps.js
        │   ├── rooms.js
        │   ├── payments.js
        │   ├── monthlyRecords.js
        │   └── complaints.js
        └── controllers/
            ├── campsController.js
            ├── roomsController.js
            ├── paymentsController.js
            ├── monthlyRecordsController.js
            └── complaintsController.js
```

---

## Next Steps

### Immediate
1. Read `README.md` for full API documentation
2. Test all endpoints with the examples above
3. Read `BARTAWI_CMS_DB_COMPLETE.md` for architecture details

### Frontend (Next Phase)
1. Create `/client` folder with Next.js
2. Build dashboard showing camp occupancy + financials
3. Add interactive camp maps (once layout paper arrives)
4. Build room management interface
5. Add payment recording UI
6. Add complaints management

### Authentication (Required for Production)
1. Implement JWT login endpoint
2. Add user registration
3. Add refresh token rotation
4. Update middleware to extract tenant_id from JWT
5. Add RBAC permission checks

### Production Deployment
1. Deploy PostgreSQL to AWS RDS or Supabase
2. Deploy API to AWS App Runner
3. Set environment variables in production
4. Update CORS settings for production frontend
5. Enable SSL/HTTPS

---

## Known Issues (from Real Data)

1. **HHM Electromechanical LLC** - Legal dispute, 11 rooms with balances
2. **Tayas Contracting** - Contracts expired March 31, 2026
3. **BB06 Casa Co.** - Payment discussion needed
4. **Missing personal data** - Require at check-in

See `BARTAWI_CMS_DB_COMPLETE.md` Section: "Known Data Issues"

---

## Support

All endpoints tested and working. The system is ready for frontend development.

**Database:** ✅ 453 rooms deployed
**API:** ✅ 9 endpoints operational
**Data:** ✅ 1,359 real financial records loaded
