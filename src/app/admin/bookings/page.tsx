'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
   CalendarCheck,
   Clock,
   Package,
   User,
   Loader2,
   CheckCircle2,
   AlertTriangle,
   Square
} from 'lucide-react'
import { completeBooking, getBookings } from '@/actions/bookings'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function BookingManagement() {
   const [bookings, setBookings] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [filter, setFilter] = useState('returned')
   const [processingId, setProcessingId] = useState<string | null>(null)

   const loadBookings = useCallback(async () => {
      setLoading(true)
      const res = await getBookings({ status: filter === 'all' ? undefined : filter })
      if (res.success) setBookings(res.data.documents)
      else alert(res.error)
      setLoading(false)
   }, [filter])

   useEffect(() => {
      loadBookings()
   }, [loadBookings])

   const handleEndBooking = async (id: string) => {
      if (!confirm('Approve equipment return and complete this booking?')) return
      setProcessingId(id)
      const res = await completeBooking(id)
      if (res.success) await loadBookings()
      else alert(res.error)
      setProcessingId(null)
   }

   return (
      <div className="space-y-8 pb-12 md:space-y-12 md:pb-20">
         <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10">
            <div className="max-w-2xl">
               <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest border border-amber-500/20 shadow-lg shadow-amber-500/5">
                     Booking Activity
                  </span>
               </div>
               <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground pb-1 leading-none">Bookings</h1>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
               <div className="flex w-max min-w-full rounded-lg border border-border bg-muted p-1">
                  {['returned', 'active', 'expired', 'completed', 'all'].map((f) => (
                     <button
                        key={f}
                        onClick={() => setFilter(f)}
                        aria-pressed={filter === f}
                        className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
                     >
                        {f}
                     </button>
                  ))}
               </div>
            </div>
         </header>

         <div className="grid grid-cols-1 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
               {bookings.length > 0 ? bookings.map((b, i) => (
                  <motion.div
                     key={b.id}
                     initial={{ opacity: 0, scale: 0.98, x: -20 }}
                     animate={{ opacity: 1, scale: 1, x: 0 }}
                     exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                     transition={{ duration: 0.5, delay: i * 0.05, type: 'spring' }}
                  >
                     <Card className="bg-card border-border rounded-xl overflow-hidden group hover:border-primary/50 transition-shadow duration-200 hover:shadow-md h-full">
                        <CardContent className="p-4 sm:p-6 md:p-8">
                           <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
                              <div className="flex-1 space-y-5 sm:space-y-6">
                                 <div className="flex items-start justify-between gap-3">
                                    <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase border shadow-sm ${b.status === 'returned' || b.status === 'expired' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                       b.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                          'bg-primary text-primary-foreground border-border'
                                       }`}>
                                       {b.status}
                                    </div>
                                 </div>

                                 <div>
                                    <h3 className="text-2xl sm:text-3xl font-bold leading-tight transition-colors duration-300">{b.sportName}</h3>
                                    <span className="mt-2 inline-flex bg-primary px-2 py-1 rounded-md text-primary-foreground font-medium text-xs">Court: {b.courtNo || '—'}</span>
                                 </div>

                                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-5 border-t border-border">
                                    <div className="space-y-2">
                                       <p className="text-xs font-bold uppercase text-muted-foreground">Player Details</p>
                                       <div className="flex items-center gap-2 sm:gap-3">
                                          <div className="hidden sm:flex w-10 h-10 rounded-lg bg-primary items-center justify-center text-primary-foreground">
                                             <User className="w-5 h-5" />
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                             <span className="text-sm font-semibold truncate">{b.user?.name || 'Unknown'}</span>
                                             <span className="text-xs font-medium text-muted-foreground">ID: {b.user?.rollNumber || 'N/A'}</span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-xs font-bold uppercase text-muted-foreground">Booking Time</p>
                                       <div className="flex items-center gap-2 sm:gap-3">
                                          <div className="hidden sm:flex w-10 h-10 rounded-lg bg-primary items-center justify-center text-primary-foreground">
                                             <Clock className="w-5 h-5" />
                                          </div>
                                          <div className="flex flex-col">
                                             <span className="text-sm font-semibold">{b.startTime} - {b.endTime}</span>
                                             <span className="text-xs font-medium text-muted-foreground">{b.date}</span>
                                          </div>
                                       </div>
                                    </div>
                                     <div className="space-y-2 col-span-2 lg:col-span-1">
                                        <p className="text-xs font-bold uppercase text-muted-foreground">Equipments Issued</p>
                                        <div className="flex flex-wrap gap-2">
                                           {b.BookingEquipment && b.BookingEquipment.length > 0 ? b.BookingEquipment.map((be: any, idx: number) => {
                                              return (
                                                 <span key={idx} className="px-3 py-1.5 bg-primary border border-border rounded-lg text-xs font-semibold flex items-center gap-2">
                                                    <Package className="w-3.5 h-3.5 text-primary-foreground" />
                                                    {be.Equipment?.name || 'Unknown'} <span className="text-primary-foreground ml-1">× {be.count}</span>
                                                 </span>
                                              )
                                           }) : <span className="text-sm font-medium text-muted-foreground italic mt-1">No equipments issued</span>}
                                        </div>
                                     </div>
                                 </div>
                              </div>

                              <div className="shrink-0 w-full lg:w-72 flex flex-col justify-center items-center border-t border-border lg:border-t-0 lg:border-l lg:pl-8 pt-5 lg:pt-0">
                                 {b.status === 'returned' || b.status === 'expired' ? (
                                    <div className="w-full space-y-3">
                                       <div className="p-4 sm:p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center sm:flex-col text-left sm:text-center gap-3">
                                          <div className="text-amber-500">
                                             <AlertTriangle className="w-6 h-6" />
                                          </div>
                                          <div>
                                             <p className="text-sm font-bold text-amber-500">Approval Required</p>
                                             <p className="text-xs text-amber-500/80 font-medium mt-1">
                                                {b.status === 'returned' ? 'Verify equipment return' : 'Booking time ended'}
                                             </p>
                                          </div>
                                       </div>
                                       <Button
                                          className="w-full py-6 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white border-0 shadow-sm"
                                          onClick={() => handleEndBooking(b.id)}
                                          disabled={processingId === b.id}
                                       >
                                          {processingId === b.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Approve & Complete</>}
                                       </Button>
                                    </div>
                                 ) : b.status === 'active' ? (
                                    <div className="w-full space-y-3">
                                       <div className="p-4 sm:p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center sm:flex-col text-left sm:text-center gap-3">
                                          <div className="text-emerald-500">
                                             <Clock className="w-6 h-6" />
                                          </div>
                                          <div>
                                             <p className="text-sm font-bold text-emerald-500">Active Booking</p>
                                             <p className="text-xs text-emerald-500/80 font-medium mt-1">End this session</p>
                                          </div>
                                       </div>
                                       <Button
                                          className="w-full py-6 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white border-0 shadow-sm"
                                          onClick={() => handleEndBooking(b.id)}
                                          disabled={processingId === b.id}
                                       >
                                          {processingId === b.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Square className="w-5 h-5 mr-2" /> End Booking</>}
                                       </Button>
                                    </div>
                                 ) : (
                                    <div className="flex flex-col items-center gap-6 py-10 opacity-30">

                                    </div>
                                 )}
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </motion.div>
               )) : (
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="text-center py-24 sm:py-40 border border-border border-dashed rounded-2xl bg-secondary/1"
                  >
                     <div className="w-20 h-20 bg-background border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CalendarCheck className="w-8 h-8 text-muted-foreground" />
                     </div>
                     <h3 className="text-2xl font-bold">No Bookings Found</h3>
                     <p className="text-muted-foreground text-sm font-medium mt-2">No bookings currently matching the <span className="text-primary font-semibold">{filter}</span> filter.</p>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>
   )
}
