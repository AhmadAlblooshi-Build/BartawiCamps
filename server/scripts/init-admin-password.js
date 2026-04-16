#!/usr/bin/env node
/**
 * Sets the password for a user.
 * Usage: ADMIN_EMAIL=ahmad@bartawi.com ADMIN_PASSWORD='...' node scripts/init-admin-password.js
 * Optional: TENANT_ID='...' to override DEFAULT_TENANT_ID from .env
 */
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const tenantId = process.env.TENANT_ID || process.env.DEFAULT_TENANT_ID;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD env vars are required');
    process.exit(1);
  }
  if (!tenantId) {
    console.error('TENANT_ID or DEFAULT_TENANT_ID env var is required');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('Password must be at least 12 characters');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.users.update({
    where: {
      tenant_id_email: {
        tenant_id: tenantId,
        email: email.toLowerCase()
      }
    },
    data: { password_hash: hash }
  });
  console.log(`✓ Password set for ${user.email} (${user.id})`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
