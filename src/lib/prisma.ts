import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'
import { requireServerEnv } from './env'
const { Pool } = pkg

declare global {
  var prisma: PrismaClient | undefined
  var pgPool: InstanceType<typeof Pool> | undefined
}

const pool = globalThis.pgPool ?? new Pool({
  connectionString: requireServerEnv('DATABASE_URL'),
  max: Number.parseInt(process.env.PG_MAX_POOL_SIZE || '20', 10) || 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

const adapter = new PrismaPg(pool)

// Interactive mutations may legitimately wait on row locks; reads must not use them.
export const interactiveTransactionOptions = { maxWait: 10_000, timeout: 15_000 }

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

// One Prisma client and pg.Pool per Node.js process, including production bundles.
globalThis.prisma = prisma
globalThis.pgPool = pool

export default prisma;
