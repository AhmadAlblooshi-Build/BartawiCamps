import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function getCampId() {
  const camp = await prisma.camps.findFirst({
    select: { id: true, name: true }
  })
  console.log(JSON.stringify(camp))
  await prisma.$disconnect()
}

getCampId()
