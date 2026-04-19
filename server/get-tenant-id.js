import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const tenant = await prisma.tenants.findFirst({
  where: { slug: 'bartawi' },
  select: { id: true, name: true, slug: true }
});

if (tenant) {
  console.log('BARTAWI_TENANT_ID=', tenant.id);
  console.log('Name:', tenant.name);
} else {
  console.log('ERROR: Bartawi tenant not found');
}

await prisma.$disconnect();
