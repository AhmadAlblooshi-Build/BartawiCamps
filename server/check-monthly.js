import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  const count = await prisma.monthly_records.count()
  console.log('monthly_records count:', count)

  if (count > 0) {
    const sample = await prisma.monthly_records.findFirst({
      include: { rooms: { select: { room_number: true } } }
    })
    console.log('Sample record:', JSON.stringify(sample, null, 2))
  }

  await prisma.$disconnect()
}

check()
