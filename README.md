# Bartawi Camp Management System - Backend API

## Overview

Complete REST API for managing labor camps with multi-tenant support, financial tracking, occupancy management, and complaints system.

**Tech Stack:**
- **Backend:** Node.js 20+ with Express
- **Database:** PostgreSQL 15+ (Docker)
- **ORM:** Prisma
- **Authentication:** JWT (placeholder - to be implemented)

---

## Quick Start

### 1. Start the Database

```bash
docker-compose up -d
```

This will:
- Create PostgreSQL container on port 5432
- Automatically deploy schema and all seed data
- Load 453 rooms + 1,359 monthly records (Jan-Mar 2026)

### 2. Install Dependencies & Start Server

```bash
cd server
npm install
npm run dev
```

Server runs on **http://localhost:3001**

### 3. Verify Deployment

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-15T16:19:38.456Z"
}
```

---

## Database Details

### Deployed Data

- **Camps:** 2 (Camp 1: 274 rooms, Camp 2: 179 rooms)
- **Buildings:** 14 (6 in Camp 1, 8 in Camp 2)
- **Blocks:** 28 (2 floors per building)
- **Rooms:** 453 total
- **Companies:** 79 (Camp 2 tenants)
- **Individuals:** 208 (Camp 1 tenants)
- **Monthly Records:** 1,359 (Jan-Mar 2026 real financial data)
- **Feature Flags:** 8 (3 active, 5 dormant)

### Known Data Issues

1. **HHM Electromechanical LLC** - Legal dispute, 11 rooms with outstanding balances
2. **Tayas Contracting LLC** - Contracts expired 2026-03-31
3. **BB06 Casa Co. & EE06 Ramdes** - Payment issues, remarks: "Wael & Elhety to discuss"
4. **Missing personal data** - Many fields empty, require at check-in

---

## API Endpoints

### Base URL
```
http://localhost:3001/api
```

### Multi-Tenancy
All endpoints automatically filter by `tenant_id` from middleware. Default tenant: `a17e9d40-a011-a14e-0b0e-67b0a0dbc71f` (Bartawi)

---

## Camps

### GET /api/camps
List all camps for the tenant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "4c935f2b-23b9-b94c-99ca-cb2ee0620045",
      "name": "Camp 1",
      "code": "C1",
      "total_rooms": 274,
      "leasable_rooms": 268,
      "map_configured": false
    }
  ],
  "count": 2
}
```

### GET /api/camps/:campId/dashboard
Occupancy stats + financial summary for current month

**Response:**
```json
{
  "success": true,
  "data": {
    "camp": {
      "id": "...",
      "name": "Camp 1",
      "total_rooms": 274,
      "leasable_rooms": 268
    },
    "occupancy": {
      "totalRooms": 274,
      "occupiedRooms": 268,
      "vacantRooms": 0,
      "occupancyRate": "100.00",
      "statusBreakdown": {
        "occupied": 268,
        "bartawi_use": 6
      }
    },
    "financial": {
      "month": 4,
      "year": 2026,
      "totalRent": 0,
      "totalPaid": 0,
      "totalBalance": 0,
      "collectionRate": 0
    }
  }
}
```

### GET /api/camps/:campId/buildings
All buildings with blocks and room counts

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "code": "A",
      "name": "Building A",
      "floor_count": 2,
      "totalRooms": 28,
      "blocks": [
        {
          "code": "A",
          "floor_label": "Ground",
          "room_count": 14
        },
        {
          "code": "AA",
          "floor_label": "First",
          "room_count": 14
        }
      ]
    }
  ]
}
```

### GET /api/camps/:campId/rooms
All rooms with current occupancy

**Query Parameters:**
- `status` - Filter by room status (occupied | vacant | maintenance | bartawi_use)
- `building_id` - Filter by building
- `block_id` - Filter by block
- `room_type` - Filter by type (standard | bartawi | commercial | service)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "room_number": "A01",
      "status": "occupied",
      "room_type": "standard",
      "max_capacity": 6,
      "standard_rent": "3600",
      "block": {
        "code": "A",
        "floor_label": "Ground"
      },
      "building": {
        "code": "A",
        "name": "Building A"
      },
      "currentOccupancy": {
        "occupantName": "Mahmoud Attia",
        "occupantType": "individual",
        "peopleCount": 5,
        "monthlyRent": "3600"
      }
    }
  ],
  "count": 274
}
```

---

## Rooms

### GET /api/rooms/:roomId
Single room with full details, current occupancy, and latest monthly record

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "room_number": "A03",
    "status": "occupied",
    "room_type": "standard",
    "max_capacity": 12,
    "block": {
      "code": "A",
      "floor_label": "Ground"
    },
    "building": {
      "code": "A",
      "name": "Building A"
    },
    "camp": {
      "name": "Camp 2"
    },
    "currentOccupancy": {
      "peopleCount": 12,
      "monthlyRent": "3300",
      "occupant": {
        "name": "HHM ELECTROMECHANICAL LLC"
      },
      "occupantType": "company"
    },
    "latestMonthlyRecord": {
      "month": 3,
      "year": 2026,
      "rent": "3300",
      "paid": "1000",
      "balance": "2300",
      "payments": [
        {
          "amount": "1000",
          "payment_method": "bank_transfer",
          "payment_date": "2026-04-15"
        }
      ]
    }
  }
}
```

---

## Monthly Records

### GET /api/monthly-records
List monthly financial records with filters

**Query Parameters:**
- `camp_id` - Filter by camp
- `month` - Filter by month (1-12)
- `year` - Filter by year
- `has_balance` - Set to "true" to show only records with outstanding balance
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "month": 3,
      "year": 2026,
      "rent": "3300",
      "paid": "1000",
      "balance": "2300",
      "peopleCount": 12,
      "remarks": null,
      "room": {
        "room_number": "A03",
        "building": {
          "code": "A"
        }
      },
      "occupant": {
        "name": "HHM ELECTROMECHANICAL LLC"
      },
      "occupantType": "company",
      "payments": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalCount": 1359,
    "totalPages": 28
  },
  "summary": {
    "totalRent": 1848770,
    "totalPaid": 1799701,
    "totalBalance": 49069
  }
}
```

---

## Payments

### POST /api/payments
Log a payment against a monthly record

**Request Body:**
```json
{
  "monthly_record_id": "f02a22ab-cc45-6772-e974-6891b28f5710",
  "amount": 1000,
  "payment_method": "bank_transfer",
  "payment_date": "2026-04-15",
  "reference_number": "TXN-20260415-001",
  "bank_name": "Emirates NBD",
  "cheque_number": null,
  "notes": "Partial payment for March 2026"
}
```

**Payment Methods:**
- `cash`
- `cheque`
- `bank_transfer`
- `card`

**Response:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "payment": {
      "id": "...",
      "amount": "1000",
      "payment_method": "bank_transfer",
      "payment_date": "2026-04-15",
      "reference_number": "TXN-20260415-001"
    },
    "monthlyRecord": {
      "id": "...",
      "rent": "3300",
      "paid": "1000",
      "balance": "2300"
    }
  }
}
```

**Important:**
- Payments automatically update the `paid` field in monthly records
- Balance is a generated column: `rent - paid`
- Cannot add payments to locked monthly records

---

## Complaints

### GET /api/complaints
List complaints with filters

**Query Parameters:**
- `camp_id` - Filter by camp
- `status` - Filter by status (open | in_progress | resolved | closed)
- `priority` - Filter by priority (low | medium | high | urgent)
- `category_id` - Filter by category
- `building_id` - Filter by building
- `room_id` - Filter by room
- `reported_via` - Filter by reporting method (staff | qr_code | mobile_app)
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "complaintRef": "CMP-20260415-0001",
      "title": "AC not working properly",
      "description": "...",
      "status": "open",
      "priority": "high",
      "reportedByName": "Ahmed Hassan",
      "reportedByRoom": "A03",
      "reportedVia": "staff",
      "camp": {
        "name": "Camp 2"
      },
      "room": {
        "room_number": "A03"
      }
    }
  ],
  "pagination": {...}
}
```

### POST /api/complaints
Create a new complaint

**Request Body:**
```json
{
  "camp_id": "1af2c34d-6c38-1b45-277f-072f900acbc1",
  "room_id": "bfaa8695-827b-3747-4fff-7549af3251ab",
  "building_id": null,
  "category_id": null,
  "title": "AC not working properly",
  "description": "The air conditioning unit is making loud noises",
  "priority": "high",
  "status": "open",
  "reported_by_name": "Ahmed Hassan",
  "reported_by_room": "A03",
  "reported_via": "staff",
  "image_urls": []
}
```

**Response:**
```json
{
  "success": true,
  "message": "Complaint created successfully",
  "data": {
    "id": "...",
    "complaint_ref": "CMP-20260415-0001",
    "title": "AC not working properly",
    "status": "open",
    "priority": "high",
    ...
  }
}
```

**Complaint Reference Format:** `CMP-YYYYMMDD-XXXX`

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

---

## Database Schema

### Key Tables
- `tenants` - Multi-tenant support
- `camps` - Camp configuration
- `buildings` → `blocks` → `rooms` - Physical structure
- `companies` / `individuals` - Tenant entities
- `room_occupancy` - Current occupancy tracking
- `monthly_records` - Financial records with generated balance column
- `payments` - Payment transactions
- `complaints` - Maintenance and service requests
- `sensor_readings` (partitioned) - IoT sensor data (dormant)
- `audit_logs` (partitioned) - System audit trail

### Dormant Features
Activate via `feature_flags` table:
- `iot_sensor_pipeline` - IoT sensor integration
- `tenant_self_service_complaints` - QR code complaints
- `mobile_app_access` - Mobile app notifications
- `sensor_anomaly_alerts` - Automated sensor alerts
- `multi_tenant_saas` - Public SaaS mode

---

## Development

### Useful Commands

```bash
# Start database
docker-compose up -d

# View database logs
docker logs bartawi_postgres

# Access PostgreSQL shell
docker exec -it bartawi_postgres psql -U bartawi -d bartawi_cms

# Regenerate Prisma schema (if schema changes)
cd server
npx prisma db pull
npx prisma generate

# View Prisma Studio (database GUI)
npx prisma studio
```

### Environment Variables

See `server/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - JWT signing keys
- `PORT` - API server port (default: 3001)
- `NODE_ENV` - Environment (development | production)
- `DEFAULT_TENANT_ID` - Default tenant for development

---

## Production Deployment

### AWS App Runner (Recommended)

1. **Build Docker image:**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY server/package*.json ./
   RUN npm ci --production
   COPY server/ ./
   CMD ["node", "src/index.js"]
   ```

2. **Deploy to App Runner:**
   - Connect to GitHub repo
   - Set environment variables
   - Use managed PostgreSQL (RDS or Supabase)

3. **Database Migration:**
   - Deploy schema to production PostgreSQL
   - Run seed files in order
   - Update `DATABASE_URL` in App Runner

---

## Testing

### Example Requests

```bash
# Get all camps
curl http://localhost:3001/api/camps

# Get Camp 1 dashboard
curl http://localhost:3001/api/camps/4c935f2b-23b9-b94c-99ca-cb2ee0620045/dashboard

# Get rooms with outstanding balance
curl "http://localhost:3001/api/monthly-records?has_balance=true&limit=10"

# Create a payment
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -d @test-payment.json

# Create a complaint
curl -X POST http://localhost:3001/api/complaints \
  -H "Content-Type: application/json" \
  -d @test-complaint.json
```

---

## Next Steps

1. ✅ **Backend API** - Complete
2. ⏳ **Authentication** - Implement JWT login/refresh
3. ⏳ **Frontend** - Next.js dashboard with interactive camp maps
4. ⏳ **Map Configuration** - Process layout paper and populate geometry
5. ⏳ **IoT Integration** - Activate sensor pipeline when hardware ready
6. ⏳ **Mobile App** - React Native app for tenants

---

## Support

For issues or questions:
- Check `BARTAWI_CMS_DB_COMPLETE.md` for complete architecture
- Review seed SQL files for data structure
- Check Docker logs: `docker logs bartawi_postgres`
- Check API logs: Server runs with Morgan logging in development

**Database is production-ready with 453 rooms and 1,359 real financial records.**
