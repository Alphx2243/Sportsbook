'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface AdminStatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'purple' | 'emerald' | 'rose' | 'amber'
  description?: string
}

export default function AdminStatCard({ title, value, icon: Icon, color, description }: AdminStatCardProps) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/10',
  }

  const bgGradient = {
    blue: 'from-blue-500/20 to-transparent',
    purple: 'from-purple-500/20 to-transparent',
    emerald: 'from-emerald-500/20 to-transparent',
    rose: 'from-rose-500/20 to-transparent',
    amber: 'from-amber-500/20 to-transparent',
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-card p-6 rounded-xl border border-border relative overflow-hidden group transition-all duration-300 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md"
    >
      <div className={`absolute -top-10 -right-10 w-40 h-40 blur-[80px] opacity-20 bg-gradient-to-br ${bgGradient[color]} group-hover:opacity-40 transition-opacity duration-700`} />
      
      <div className="flex items-start justify-between relative z-10 w-full mb-4">
        <div className={`p-3 rounded-lg border ${colorMap[color]} transition-transform duration-300`}>
           <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="relative z-10">
         <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
         <h3 className="text-3xl font-bold text-foreground transition-colors duration-300">{value}</h3>
         {description && <p className="text-xs text-muted-foreground mt-2 font-medium opacity-80 transition-opacity">{description}</p>}
      </div>
    </motion.div>
  )
}
