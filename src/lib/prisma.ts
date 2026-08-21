import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'
import { requireServerEnv } from './env'
const { Pool } = pkg

const pool = new Pool({
  connectionString: requireServerEnv('DATABASE_URL'),
})

const adapter = new PrismaPg(pool)

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export default prisma;
