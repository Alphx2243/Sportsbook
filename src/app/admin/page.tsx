'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
   Users,
   CalendarCheck,
   Trophy,
   Activity,
   ArrowUpRight,
   Clock,
   CheckCircle2,
   TrendingUp,
   AlertTriangle
} from 'lucide-react'
import AdminStatCard from '@/components/AdminStatCard'
import { getAdminStats } from '@/actions/admin'
import { Card, CardContent } from '@/components/ui/Card'
import { Loader2 } from 'lucide-react'

export default function AdminDashboard() {
   const [stats, setStats] = useState<any>(null)
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      const fetchStats = async () => {
         const res = await getAdminStats()
         if (res.success) setStats(res.data)
         setLoading(false)
      }
      fetchStats()
   }, [])

   if (loading) {
      return (
         <div className="h-[70vh] flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
         </div>
      )
   }

   const container = {
      hidden: { opacity: 0 },
      show: {
         opacity: 1,
         transition: {
            staggerChildren: 0.1
         }
      }
   }

   const item = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
   }
   
   return (
      <motion.div
         variants={container}
         initial="hidden"
         animate="show"
         className="space-y-16 pb-20"
      >
         <header className="flex flex-col pt-8 md:flex-row md:items-end justify-between gap-8 mb-8">
            <motion.div variants={item}>
               <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground pb-2">Dashboard</h1>
            </motion.div>


         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div variants={item}>
               <AdminStatCard
                  title="Total Athletes"
                  value={stats?.userCount || 0}
                  icon={Users}
                  color="blue"
                  description="Total registered users across the platform."
               />
            </motion.div>
            <motion.div variants={item}>
               <AdminStatCard
                  title="Total Bookings"
                  value={stats?.bookingCount || 0}
                  icon={CalendarCheck}
                  color="purple"
                  description="Total number of sessions managed."
               />
            </motion.div>
            <motion.div variants={item}>
               <AdminStatCard
                  title="Live Sessions"
                  value={stats?.activeBookings || 0}
                  icon={Activity}
                  color="emerald"
                  description="Currently active or pending approval."
               />
            </motion.div>
            <motion.div variants={item}>
               <AdminStatCard
                  title="Sport Categories"
                  value={stats?.sportCount || 0}
                  icon={Trophy}
                  color="amber"
                  description="Varieties of sports currently enabled."
               />
            </motion.div>
         </div>
      </motion.div>
   )
}
