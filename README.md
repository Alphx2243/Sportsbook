# SportsBook - User Website

SportsBook is a comprehensive campus sports management ecosystem. The platform provides a high-performance, real-time interface for facility bookings, live match tracking, and facility occupancy monitoring, supported by a distributed caching layer for robust security.
## Architecture
The ecosystem is architected as three independent specialized platforms to ensure scalability and optimal performance:

- **User Platform**: A Next.js client-side interface for students and athletes to manage bookings, view live scores, and monitor occupancy.
- **Admin Portal**: A dedicated management dashboard for administrative tasks, including booking approvals and equipment inventory oversight.
- **Socket Server**: A centralized, standalone Node.js WebSocket hub that manages real-time event broadcasting across the entire ecosystem.
- **Caching & Rate Limiting**: A Redis-backed (Upstash) distributed layer that ensures high availability and precise traffic control across multiple instances.
## Technical Features
### Real-time Synchronization
- **Live Match Tracking**: Instant score updates for campus sporting events via WebSocket events.
- **Occupancy Visualization**: Real-time density monitoring.
- **Inventory Status**: Immediate updates on the availability of sports equipment and court resources triggered by backend server actions.
### Booking and Scheduling
- **QR Integration**: Automated check-in and check-out workflows via unique QR code identifiers.
- **Concurrency Management**: Robust logic using PostgreSQL transactions to prevent overlapping sessions or double-booking of resources.
- **Equipment Lifecycle**: Integrated tracking for the distribution and return of sports gear.

### Security and Infrastructure
- **Redis-Backed Rate Limiting**: Custom Next.js Edge Middleware utilizes Redis for distributed sliding-window rate limiting. It restricts traffic to 60 requests per minute per IP and a global cap of 700 requests per minute.
- **JWT Authentication**: Secure user sessions managed via JSON Web Tokens (jose) for stateless authentication.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Next.js 15 (App Router), React 19
- **State & Animation**: Framer Motion, React Context API
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (Upstash)
- **Real-time**: Socket.io (Standalone Node.js Server)
- **Visualization**: Recharts for occupancy analytics
- **Styling**: Tailwind CSS 4.0

## Getting Started

### 1. Installation
Install the necessary dependencies for the project:
```bash
npm install
```

### 2. Environment Configuration
Create a .env file in the root directory with the following variables:
```env
# Database & Auth
DATABASE_URL=""
JWT_SECRET=""

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Socket Configuration
NEXT_PUBLIC_SOCKET_URL=""
SOCKET_INTERNAL_SECRET=""

# Media & Email
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

### 3. Database Setup
Synchronize the Prisma schema with your database:
```bash
npx prisma generate
npx prisma db push
```

### 4. Running the Project
To start the development server:
```bash
npm run dev
```

Note: Ensure the standalone Socket Server is also running to enable real-time features.

## Test Credentials

### User Access
- **Email**: kunal24313@iiitd.ac.in
- **Password**: aforapple
