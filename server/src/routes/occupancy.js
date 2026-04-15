import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// POST /api/occupancy/checkout
router.post('/checkout', async (req, res) => {
  const {
    room_id,
    camp_id,
    occupancy_id,
    checkout_date,
    reason_for_leaving,
    final_balance_settled,
    notes
  } = req.body;

  if (!room_id || !camp_id || !checkout_date) {
    return res.status(400).json({ error: 'room_id, camp_id, checkout_date required' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Close current occupancy
      if (occupancy_id) {
        await tx.room_occupancy.update({
          where: { id: occupancy_id },
          data: {
            is_current: false,
            check_out_date: new Date(checkout_date),
            reason_for_leaving,
            status: 'checked_out',
            updated_at: new Date(),
          }
        });
      } else {
        // Find and close any active occupancy for this room
        await tx.room_occupancy.updateMany({
          where: { room_id, is_current: true },
          data: {
            is_current: false,
            check_out_date: new Date(checkout_date),
            reason_for_leaving: reason_for_leaving || 'Manual checkout',
            status: 'checked_out',
          }
        });
      }

      // 2. Update room status to vacant
      const room = await tx.rooms.update({
        where: { id: room_id },
        data: {
          status: 'vacant',
          updated_at: new Date(),
        }
      });

      // 3. Log audit
      await tx.audit_logs.create({
        data: {
          action: 'occupancy.checkout',
          resource_type: 'room',
          resource_id: room_id,
          new_values: {
            checkout_date,
            reason_for_leaving,
            final_balance_settled: final_balance_settled || false,
            notes,
          },
          created_at: new Date(),
        }
      });

      return room;
    });

    res.json({ success: true, room: result, message: 'Tenant checked out successfully' });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Checkout failed', message: err.message });
  }
});

// POST /api/occupancy/checkin
router.post('/checkin', async (req, res) => {
  const {
    room_id,
    camp_id,
    // Camp 1 fields
    owner_name,
    individual_id,
    // Camp 2 fields
    company_id,
    company_name,
    contract_type,
    contract_start_date,
    contract_end_date,
    ejari_number,
    // Both camps
    monthly_rent,
    people_count,
    checkin_date,
    off_days,
  } = req.body;

  if (!room_id || !camp_id || !monthly_rent || !checkin_date) {
    return res.status(400).json({ error: 'room_id, camp_id, monthly_rent, checkin_date required' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let resolvedIndividualId = individual_id;
      let resolvedCompanyId = company_id;

      // Auto-create individual if name provided but no ID
      if (owner_name && !individual_id) {
        const tenant_id_row = await tx.tenants.findFirst({ where: { slug: 'bartawi' } });
        const newIndividual = await tx.individuals.create({
          data: {
            tenant_id: tenant_id_row.id,
            owner_name,
            is_active: true,
            created_at: new Date(),
          }
        });
        resolvedIndividualId = newIndividual.id;
      }

      // Auto-create company if name provided but no ID
      if (company_name && !company_id) {
        const tenant_id_row = await tx.tenants.findFirst({ where: { slug: 'bartawi' } });
        const newCompany = await tx.companies.create({
          data: {
            tenant_id: tenant_id_row.id,
            name: company_name,
            name_normalized: company_name.toUpperCase(),
            is_active: true,
            created_at: new Date(),
          }
        });
        resolvedCompanyId = newCompany.id;
      }

      // Create contract if Camp 2
      let contractId = null;
      if (resolvedCompanyId && contract_type && contract_type !== 'monthly') {
        const newContract = await tx.contracts.create({
          data: {
            camp_id,
            room_id,
            company_id: resolvedCompanyId,
            contract_type,
            monthly_rent: parseFloat(monthly_rent),
            start_date: contract_start_date ? new Date(contract_start_date) : new Date(checkin_date),
            end_date: contract_end_date ? new Date(contract_end_date) : null,
            ejari_number: ejari_number || null,
            status: 'active',
            created_at: new Date(),
          }
        });
        contractId = newContract.id;
      }

      // Create occupancy record
      const occupancy = await tx.room_occupancy.create({
        data: {
          room_id,
          camp_id,
          individual_id: resolvedIndividualId || null,
          company_id: resolvedCompanyId || null,
          contract_id: contractId || null,
          people_count: parseInt(people_count) || 0,
          monthly_rent: parseFloat(monthly_rent),
          check_in_date: new Date(checkin_date),
          off_days: parseInt(off_days) || 0,
          status: 'active',
          is_current: true,
          created_at: new Date(),
        }
      });

      // Update room status to occupied
      const room = await tx.rooms.update({
        where: { id: room_id },
        data: {
          status: 'occupied',
          standard_rent: parseFloat(monthly_rent),
          updated_at: new Date(),
        }
      });

      // Create monthly record for current month
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Check if record already exists
      const existing = await tx.monthly_records.findFirst({
        where: { room_id, month, year }
      });

      if (!existing) {
        await tx.monthly_records.create({
          data: {
            room_id,
            camp_id,
            occupancy_id: occupancy.id,
            month,
            year,
            individual_id: resolvedIndividualId || null,
            owner_name: owner_name || null,
            company_id: resolvedCompanyId || null,
            company_name: company_name || null,
            contract_type: contract_type || null,
            people_count: parseInt(people_count) || 0,
            rent: parseFloat(monthly_rent),
            paid: 0,
            off_days: parseInt(off_days) || 0,
            created_at: new Date(),
          }
        });
      }

      return { room, occupancy };
    });

    res.json({ success: true, ...result, message: 'Tenant checked in successfully' });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Check-in failed', message: err.message });
  }
});

export default router;
