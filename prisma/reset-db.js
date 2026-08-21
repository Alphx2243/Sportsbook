const { createHmac, randomUUID } = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
require('dotenv').config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    throw new Error('DATABASE_URL must be set.')
}

const pool = new Pool({ connectionString, max: 1 })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const QR_VERSION = 2

const sports = [
    {
        name: 'Badminton',
        numberOfCourts: 3,
        courts: ['Court 1', 'Court 2', 'Court 3'],
        equipment: [
            { name: 'Racket', total: 20 },
            { name: 'Shuttle', total: 50 },
        ],
    },
    {
        name: 'Squash',
        numberOfCourts: 2,
        courts: ['Court 1', 'Court 2'],
        equipment: [
            { name: 'Racket', total: 10 },
            { name: 'Ball', total: 20 },
        ],
    },
    {
        name: 'Table Tennis',
        numberOfCourts: 4,
        courts: ['Table 1', 'Table 2', 'Table 3', 'Table 4'],
        equipment: [
            { name: 'Racket', total: 20 },
            { name: 'Ball', total: 50 },
        ],
    },
    {
        name: 'Tennis',
        numberOfCourts: 2,
        courts: ['Court 1', 'Court 2'],
        equipment: [
            { name: 'Racket', total: 15 },
            { name: 'Ball', total: 40 },
        ],
    },
    { name: 'Swimming', numberOfCourts: 1, maxCapacity: 20, courts: ['RPool'], equipment: [] },
    { name: 'Gym', numberOfCourts: 1, maxCapacity: 50, courts: ['Main Gym'], equipment: [] },
]

const users = [
    { name: 'Guard', email: 'guard@iiitd.ac.in', phone: '9810593073', rollNumber: '2024214', role: 'guard', admin: true },
    { name: 'Facility Manager', email: 'facility.manager@iiitd.ac.in', phone: '9810593074', rollNumber: '2024215', role: 'facility_manager', admin: true },
    { name: 'Admin', email: 'admin@iiitd.ac.in', phone: '9810593072', rollNumber: '2024213', role: 'Admin', admin: true },
    { name: 'Kunal Budhiraja', email: 'kunal24313@iiitd.ac.in', phone: '9810593078', rollNumber: '2024313' },
    { name: 'Alphx', email: 'alphx@iiitd.ac.in', phone: '8700740987', rollNumber: '2024333' },
    { name: 'Aarav Sharma', email: 'aarav.sharma@iiitd.ac.in', phone: '9811111111', rollNumber: '2024301' },
    { name: 'Priya Gupta', email: 'priya.gupta@iiitd.ac.in', phone: '9811111112', rollNumber: '2024302' },
    { name: 'Rohan Verma', email: 'rohan.verma@iiitd.ac.in', phone: '9811111113', rollNumber: '2024303' },
    { name: 'Sneha Kapoor', email: 'sneha.kapoor@iiitd.ac.in', phone: '9811111114', rollNumber: '2024304' },
    { name: 'Aditya Singh', email: 'aditya.singh@iiitd.ac.in', phone: '9811111115', rollNumber: '2024305' },
]

async function main() {
    if (process.env.ALLOW_DB_RESET !== 'true') {
        throw new Error('Refusing to reset database unless ALLOW_DB_RESET=true is set.')
    }

    const qrSecret = process.env.QR_CODE_SECRET

    if (!qrSecret || qrSecret.length < 32) {
        throw new Error('Set QR_CODE_SECRET to a strong value before seeding signed booking QR codes.')
    }

    console.log('Starting database reset...')
    await clearDatabase()

    const sportByName = new Map()
    for (const sport of sports) {
        const created = await prisma.sport.create({
            data: {
                name: sport.name,
                numberOfCourts: sport.numberOfCourts,
                maxCapacity: sport.maxCapacity,
                courts: {
                    create: sport.courts.map((name, index) => ({
                        id: randomUUID(),
                        name,
                        courtNumber: index + 1,
                    })),
                },
                Equipment: {
                    create: sport.equipment.map((equipment) => ({
                        id: randomUUID(),
                        name: equipment.name,
                        total: equipment.total,
                        updatedAt: new Date(),
                    })),
                },
            },
            include: { courts: true, Equipment: true },
        })
        sportByName.set(created.name, created)
        console.log(`Created sport: ${created.name}`)
    }
    return;
    const userByEmail = new Map()
    for (const user of users) {
        const created = await prisma.user.create({
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                rollNumber: user.rollNumber,
                role: user.role || 'user',
            },
        })
        userByEmail.set(created.email, created)
        console.log(`Created user: ${created.name}`)
    }

    await seedCompletedBookings(sportByName, userByEmail, qrSecret)
    console.log('Database reset complete!')
}

async function clearDatabase() {
    const tables = [
        ['GymLog', () => prisma.gymLog.deleteMany({})],
        ['Invite', () => prisma.invite.deleteMany({})],
        ['GuideApplication', () => prisma.guideApplication.deleteMany({})],
        ['Match', () => prisma.match.deleteMany({})],
        ['BookingEquipment', () => prisma.bookingEquipment.deleteMany({})],
        ['Booking', () => prisma.booking.deleteMany({})],
        ['UserSportExperience', () => prisma.userSportExperience.deleteMany({})],
        ['Equipment', () => prisma.equipment.deleteMany({})],
        ['Court', () => prisma.court.deleteMany({})],
        ['User', () => prisma.user.deleteMany({})],
        ['Sport', () => prisma.sport.deleteMany({})],
    ]

    for (const [label, clear] of tables) {
        console.log(`Cleaning ${label}...`)
        await clear()
    }
    console.log('Database cleared.')
}

async function seedCompletedBookings(sportByName, userByEmail, qrSecret) {
    const regularUsers = [...userByEmail.values()].filter((user) => user.role === 'user')
    const templates = sports.filter((sport) => sport.name !== 'Gym')
    const dates = ['2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08']
    const slots = [['06:00:00', '07:00:00'], ['09:00:00', '10:00:00'], ['16:00:00', '17:00:00']]
    let index = 0

    for (const template of templates) {
        const sport = sportByName.get(template.name)
        for (let i = 0; i < 3; i++) {
            const user = regularUsers[index % regularUsers.length]
            const court = sport.courts[i % sport.courts.length]
            const [startTime, endTime] = slots[i % slots.length]
            const startAt = new Date(`${dates[index % dates.length]}T${startTime}`)
            const endAt = new Date(`${dates[index % dates.length]}T${endTime}`)

            const booking = await prisma.booking.create({
                data: {
                    userId: user.id,
                    sportId: sport.id,
                    courtId: sport.maxCapacity ? null : court.id,
                    numberOfPlayers: template.maxCapacity ? 1 : 2,
                    startAt,
                    endAt,
                    status: 'completed',
                    scanned: true,
                },
            })

            const qrPayload = createBookingQrPayload(booking, qrSecret)
            await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    qrDetail: JSON.stringify(qrPayload),
                    qrHash: qrPayload.h,
                },
            })

            index++
        }
    }
    console.log(`Seeded ${index} signed completed bookings.`)
}

function createBookingQrPayload(booking, qrSecret) {
    const fields = {
        bookingId: booking.id,
        userId: booking.userId,
        sportId: booking.sportId,
        numberOfPlayers: booking.numberOfPlayers,
        startAt: booking.startAt,
        endAt: booking.endAt,
        courtId: booking.courtId,
    }
    return {
        v: QR_VERSION,
        b: fields.bookingId,
        u: fields.userId,
        s: fields.sportId,
        n: fields.numberOfPlayers,
        a: fields.startAt.toISOString(),
        e: fields.endAt.toISOString(),
        ...(fields.courtId ? { c: fields.courtId } : {}),
        h: createBookingQrHash(fields, qrSecret),
    }
}

function createBookingQrHash(fields, qrSecret) {
    return createHmac('sha256', qrSecret)
        .update([
            fields.bookingId,
            fields.userId,
            fields.sportId,
            String(fields.numberOfPlayers),
            fields.startAt.toISOString(),
            fields.endAt.toISOString(),
            fields.courtId || '',
        ].join('|'))
        .digest('base64url')
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
