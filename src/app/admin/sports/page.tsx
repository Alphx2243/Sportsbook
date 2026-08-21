'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
   Plus,
   Edit3,
   CheckCircle2,
   Loader2
} from 'lucide-react'
import { getSports, createSport } from '@/actions/sports'
import { updateSportInventory } from '@/actions/admin'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function availabilityWidthClass(available: number, total: number) {
   const pct = total ? available / total : 0
   if (pct >= 0.9) return 'w-full'
   if (pct >= 0.75) return 'w-3/4'
   if (pct >= 0.5) return 'w-1/2'
   if (pct >= 0.25) return 'w-1/4'
   return 'w-0'
}

export default function SportsManagement() {
   const [sports, setSports] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [editingId, setEditingId] = useState<string | null>(null)
   const [editData, setEditData] = useState<any>({})
   const [isAdding, setIsAdding] = useState(false)
   const [newSportData, setNewSportData] = useState<any>({ name: '', numberOfCourts: '', totalEquipments: '' })
   const [processing, setProcessing] = useState(false)

   const fetchSports = async () => {
      const res = await getSports()
      if (res.success) setSports(res.data.documents)
      setLoading(false)
   }

   useEffect(() => {
      fetchSports()
   }, [])

   const handleEdit = (sport: any) => {
      setEditingId(sport.id)
      setEditData({
         numberOfCourts: sport.numberOfCourts,
         maxCapacity: sport.maxCapacity || '',
         totalEquipments: (sport.Equipment || []).map((e: any) => `${e.name}:${e.total}`).join(', '),
         courtsInUse: sport.courtsInUse,
         numPlayers: sport.numPlayers
      })
   }

   const handleSave = async (id: string) => {
      setProcessing(true)
      const formattedData = {
         ...editData,
         totalEquipments: editData.totalEquipments.split(',').map((s: string) => s.trim()).filter(Boolean)
      }
      const res = await updateSportInventory(id, formattedData)
      if (res.success) {
         setSports(sports.map(s => s.id === id ? { ...s, ...formattedData } : s))
         setEditingId(null)
         fetchSports() 
      } else {
         alert(res.error)
      }
      setProcessing(false)
   }

   const handleAdd = async () => {
      setProcessing(true)
      const formattedData = {
         name: newSportData.name,
         courts: newSportData.numberOfCourts,
         totalEquipments: newSportData.totalEquipments ? newSportData.totalEquipments.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
         CourtData: Array.from({ length: parseInt(newSportData.numberOfCourts) || 0 }, (_, i) => `Court${i + 1}:0`)
      }
      const res = await createSport(formattedData)
      if (res.success) {
         setIsAdding(false)
         setNewSportData({ name: '', numberOfCourts: '', totalEquipments: '' })
         fetchSports()
      } else {
         alert(res.error)
      }
      setProcessing(false)
   }

   if (loading) {
      return (
         <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase opacity-50">Loading Sports...</p>
         </div>
      )
   }

   return (
      <div className="space-y-16 pb-20">
         <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="max-w-2xl">
               <div className="flex items-center gap-3 mb-4">
                  <span className="px-5 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-widest border border-blue-500/20 shadow-lg shadow-blue-500/5">
                     Sports Management
                  </span>
               </div>
               <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground pb-1 leading-none">Sports & Facilities</h1>
               <p className="text-muted-foreground mt-6 text-xl font-medium opacity-80 leading-relaxed">
                  Manage sports facilities, courts, and hardware inventory.
               </p>
            </div>

            <Button
               onClick={() => setIsAdding(true)}
               className="px-6 py-3 text-sm font-semibold rounded-xl shadow-sm transition-all bg-primary hover:bg-primary/90 text-primary-foreground border-0"
            >
               <Plus className="w-6 h-6 mr-4" /> Add New Sport
            </Button>
         </header>

         {isAdding && (
            <motion.div initial={{ opacity: 0, scale: 0.98, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-card p-8 rounded-2xl border border-border mb-14 shadow-sm mt-10">
               <h2 className="text-3xl font-bold mb-8">Create New Sport</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div className="space-y-3">
                     <label className="text-sm flex gap-3 font-medium text-muted-foreground px-1">Sport Name</label>
                     <Input
                        placeholder="e.g. Tennis"
                        className="bg-background border-input p-4 rounded-xl font-medium focus:border-emerald-500/50 text-base"
                        value={newSportData.name}
                        onChange={(e: any) => setNewSportData({ ...newSportData, name: e.target.value })}
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-sm flex gap-3 font-medium text-muted-foreground px-1">Total Courts</label>
                     <Input
                        type="number"
                        placeholder="0"
                        className="bg-background border-input p-4 rounded-xl font-medium focus:border-emerald-500/50 text-base"
                        value={newSportData.numberOfCourts}
                        onChange={(e: any) => setNewSportData({ ...newSportData, numberOfCourts: e.target.value })}
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-sm flex gap-3 font-medium text-muted-foreground px-1">Equipment Inventory (e.g. Racket:10)</label>
                     <Input
                        placeholder="Equipment list"
                        className="bg-background border-input p-4 rounded-xl font-medium focus:border-emerald-500/50 text-base"
                        value={newSportData.totalEquipments}
                        onChange={(e: any) => setNewSportData({ ...newSportData, totalEquipments: e.target.value })}
                     />
                  </div>
               </div>
               <div className="flex gap-4">
                  <Button className="flex-1 py-4 rounded-xl flex justify-center items-center bg-emerald-500 hover:bg-emerald-600 font-semibold shadow-sm text-white border-0" onClick={handleAdd} disabled={processing}>
                     {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Creation'}
                  </Button>
                  <Button variant="outline" className="px-8 py-4 rounded-xl font-semibold border-border hover:bg-accent" onClick={() => setIsAdding(false)}>Cancel</Button>
               </div>
            </motion.div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <AnimatePresence mode="popLayout">
               {sports.map((s, i) => (
                  <motion.div
                     key={s.id}
                     initial={{ opacity: 0, scale: 0.95, y: 30 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     transition={{ duration: 0.6, delay: i * 0.1, type: 'spring', damping: 20 }}
                  >
                     <Card className="bg-card border-border rounded-2xl overflow-hidden group hover:border-blue-500/60 transition-all duration-300 hover:shadow-md h-full">
                        <CardContent className="p-6 md:p-8 h-full flex flex-col">
                           <div className="flex items-start justify-between mb-8">
                              <div className="flex items-center gap-6">
                                 <div>
                                    <h3 className="text-3xl font-bold transition-colors duration-300 leading-none">{s.name}</h3>
                                    <p className="text-sm font-medium text-muted-foreground mt-2">Active Sport</p>
                                 </div>
                              </div>
                              {editingId !== s.id && (
                                 <button
                                    onClick={() => handleEdit(s)}
                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 text-muted-foreground hover:text-blue-500 transition-all duration-500 flex items-center justify-center shadow-lg group/edit"
                                 >
                                    <Edit3 className="w-6 h-6 group-hover/edit:scale-110 transition-transform" />
                                 </button>
                              )}
                           </div>

                           {editingId === s.id ? (
                              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 flex-1">
                                 <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                       <label className="text-sm font-medium text-muted-foreground px-1">Total Courts</label>
                                       <Input
                                          type="number"
                                          className="bg-background border-input p-4 rounded-xl font-medium text-base focus:border-emerald-500/50"
                                          value={editData.numberOfCourts}
                                          onChange={(e: any) => setEditData({ ...editData, numberOfCourts: e.target.value })}
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-sm font-medium text-muted-foreground px-1">Max Capacity</label>
                                       <Input
                                          type="number"
                                          className="bg-background border-input p-4 rounded-xl font-medium text-base focus:border-emerald-500/50"
                                          value={editData.maxCapacity}
                                          onChange={(e: any) => setEditData({ ...editData, maxCapacity: e.target.value })}
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-sm font-medium text-muted-foreground px-1">Courts In Use</label>
                                       <Input
                                          type="number"
                                          className="bg-background border-input p-4 rounded-xl font-medium text-base focus:border-emerald-500/50"
                                          value={editData.courtsInUse}
                                          onChange={(e: any) => setEditData({ ...editData, courtsInUse: e.target.value })}
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-sm font-medium text-muted-foreground px-1">Active Players</label>
                                       <Input
                                          type="number"
                                          className="bg-background border-input p-4 rounded-xl font-medium text-base focus:border-emerald-500/50"
                                          value={editData.numPlayers}
                                          onChange={(e: any) => setEditData({ ...editData, numPlayers: e.target.value })}
                                       />
                                    </div>
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground px-1">Equipment Inventory (Format: Racket:10)</label>
                                    <Input
                                       className="bg-background border-input p-4 rounded-xl font-medium text-base focus:border-emerald-500/50"
                                       value={editData.totalEquipments}
                                       onChange={(e: any) => setEditData({ ...editData, totalEquipments: e.target.value })}
                                    />
                                 </div>
                                 <div className="flex gap-4 pt-4">
                                    <Button
                                       className="flex-1 py-4 rounded-xl font-semibold bg-emerald-500 hover:bg-emerald-600 shadow-sm text-white border-0"
                                       onClick={() => handleSave(s.id)}
                                       disabled={processing}
                                    >
                                       {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Save Changes</>}
                                    </Button>
                                    <Button
                                       variant="outline"
                                       className="px-8 py-4 rounded-xl font-semibold border-border hover:bg-accent"
                                       onClick={() => setEditingId(null)}
                                    >
                                       Cancel
                                    </Button>
                                 </div>
                              </div>
                           ) : (
                              <div className="space-y-8 flex-1 transition-transform duration-300">
                                 <div className="flex flex-wrap gap-x-12 gap-y-8">
                                    <div className="space-y-2">
                                       <p className="text-sm font-medium text-muted-foreground">Courts Available</p>
                                       <div className="flex items-center gap-3">
                                          <span className="text-2xl font-bold tabular-nums">{s.numberOfCourts - s.courtsInUse} <span className="text-primary text-lg font-normal">/</span> {s.numberOfCourts}</span>
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-sm font-medium text-muted-foreground">Max Capacity</p>
                                       <div className="flex items-center gap-3">
                                          <span className="text-2xl font-bold tabular-nums">{s.maxCapacity || '∞'}</span>
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-sm font-medium text-muted-foreground">Active Players</p>
                                       <div className="flex items-center gap-3">
                                          <span className="text-2xl font-bold tabular-nums">{s.numPlayers || 0}</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="space-y-4 pt-8 border-t border-border">
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                       Equipment Availability
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                       {(s.Equipment || []).map((eq: any, idx: number) => {
                                          const available = eq.total - eq.inUse
                                          return (
                                             <div key={idx} className="px-4 py-3 bg-primary/10 border border-border rounded-xl flex items-center gap-4 transition-all hover:bg-blue-500/25 hover:border-blue-500/20 shadow-sm">
                                                <div className="flex flex-col">
                                                   <span className="text-sm font-semibold transition-colors">{eq.name}</span>
                                                   <div className="flex items-center gap-3 mt-1">
                                                      <div className="h-1.5 w-24 bg-primary rounded-full overflow-hidden">
                                                         <div className={`h-full bg-blue-500/80 transition-all duration-500 ${availabilityWidthClass(available, eq.total)}`} />
                                                      </div>
                                                      <span className="text-xs font-medium text-muted-foreground tabular-nums">{available} Avail</span>
                                                   </div>
                                                </div>
                                             </div>
                                          )
                                       })}
                                    </div>
                                 </div>
                              </div>
                           )}
                        </CardContent>
                     </Card>
                  </motion.div>
               ))}
            </AnimatePresence>
         </div>
      </div>
   )
}
