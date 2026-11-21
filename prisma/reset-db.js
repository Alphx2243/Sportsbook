const { randomUUID } = require('crypto')
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

const sports = [
    {
        name: 'Badminton',
        sportType: 'private',
        numberOfCourts: 3,
        courts: ['Court 1', 'Court 2', 'Court 3'],
        equipment: [
            { name: 'Racket', total: 20 },
            { name: 'Shuttle', total: 50 },
        ],
    },
    {
        name: 'Squash',
        sportType: 'private',
        numberOfCourts: 2,
        courts: ['Court 1', 'Court 2'],
        equipment: [
            { name: 'Racket', total: 10 },
            { name: 'Ball', total: 20 },
        ],
    },
    {
        name: 'Table Tennis',
        sportType: 'private',
        numberOfCourts: 4,
        courts: ['Table 1', 'Table 2', 'Table 3', 'Table 4'],
        equipment: [
            { name: 'Racket', total: 20 },
            { name: 'Ball', total: 50 },
        ],
    },
    {
        name: 'Tennis',
        sportType: 'private',
        numberOfCourts: 2,
        courts: ['Court 1', 'Court 2'],
        equipment: [
            { name: 'Racket', total: 15 },
            { name: 'Ball', total: 40 },
        ],
    },
    { name: 'Swimming', sportType: 'public', numberOfCourts: 1, maxCapacity: 20, courts: ['RPool'], equipment: [] },
    { name: 'Gym', sportType: 'public', numberOfCourts: 1, maxCapacity: 50, courts: ['Main Gym'], equipment: [] },
]

const users = [
    { name: 'Guard', email: 'guard.iiitd@gmail.com', phone: '9810593073', rollNumber: '9999999', role: 'guard' },
    // { name: 'Facility Manager', email: 'facility.manager@iiitd.ac.in', phone: '9810593074', rollNumber: '2024215', role: 'facility_manager' },
    // { name: 'Admin', email: 'admin@iiitd.ac.in', phone: '9810593072', rollNumber: '2024213', role: 'Admin' },
    { name: 'Kunal Budhiraja', email: 'kunal24313@iiitd.ac.in', role: 'Admin', phone: '9810593078', rollNumber: '2024313' },
    // { name: 'Alphx', email: 'alphx@iiitd.ac.in', phone: '8700740987', rollNumber: '2024333' },
    // { name: 'Aarav Sharma', email: 'aarav.sharma@iiitd.ac.in', phone: '9811111111', rollNumber: '2024301' },
    // { name: 'Priya Gupta', email: 'priya.gupta@iiitd.ac.in', phone: '9811111112', rollNumber: '2024302' },
    // { name: 'Rohan Verma', email: 'rohan.verma@iiitd.ac.in', phone: '9811111113', rollNumber: '2024303' },
    // { name: 'Sneha Kapoor', email: 'sneha.kapoor@iiitd.ac.in', phone: '9811111114', rollNumber: '2024304' },
    // { name: 'Aditya Singh', email: 'aditya.singh@iiitd.ac.in', phone: '9811111115', rollNumber: '2024305' },
]

async function main() {
    if (process.env.ALLOW_DB_RESET !== 'true') {
        throw new Error('Refusing to reset database unless ALLOW_DB_RESET=true is set.')
    }

    console.log('Starting database reset...')
    await clearDatabase()

    for (const sport of sports) {
        const created = await prisma.sport.create({
            data: {
                name: sport.name,
                sportType: sport.sportType,
                numberOfCourts: sport.numberOfCourts,
                maxCapacity: sport.maxCapacity,
                manualOccupancy: 0,
                courts: {
                    create: sport.courts.map((name, index) => ({
                        id: randomUUID(),
                        name,
                        courtNumber: index + 1,
                        isActive: true,
                        manualOccupied: false,
                        manualOccupancy: 0,
                    })),
                },
                Equipment: {
                    create: sport.equipment.map((equipment) => ({
                        id: randomUUID(),
                        name: equipment.name,
                        total: equipment.total,
                        inUse: 0,
                        updatedAt: new Date(),
                    })),
                },
            },
        })
        console.log(`Created sport: ${created.name}`)
    }
    for (const user of users) {
        const created = await prisma.user.create({
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                rollNumber: user.rollNumber,
                role: user.role,
            },
        })
        console.log(`Created user: ${created.name}`)
    }

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
        ['GlobalSchedule', () => prisma.globalSchedule.deleteMany({})],
        ['SportSchedule', () => prisma.sportSchedule.deleteMany({})],
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

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
