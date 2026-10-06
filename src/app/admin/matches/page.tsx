'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
   Trophy,
   Plus,
   Edit3,
   Trash2,
   Loader2,
   Sword,
   Target
} from 'lucide-react'
import { getAllMatches, createMatch, updateMatch, deleteMatch } from '@/actions/admin'
import { getSports } from '@/actions/sports'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function MatchScoring() {
   const [matches, setMatches] = useState<any[]>([])
   const [sports, setSports] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [editingId, setEditingId] = useState<string | null>(null)
   const [isAdding, setIsAdding] = useState(false)
   const [formData, setFormData] = useState({
      sportName: '',
      team1: '',
      team2: '',
      score1: '0',
      score2: '0',
      status: 'live'
   })
   const [processing, setProcessing] = useState(false)

   const fetchData = async () => {
      const [mRes, sRes] = await Promise.all([getAllMatches(), getSports()])
      if (mRes.success) setMatches(mRes.data)
      if (sRes.success) setSports(sRes.data.documents)
      setLoading(false)
   }

   useEffect(() => {
      fetchData()
   }, [])

   const handleEdit = (match: any) => {
      setEditingId(match.id)
      setFormData({
         sportName: match.sportName,
         team1: match.team1,
         team2: match.team2,
         score1: match.score1,
         score2: match.score2,
         status: match.status
      })
   }

   const handleSave = async (id: string | null) => {
      setProcessing(true)
      const res = id ? await updateMatch(id, formData) : await createMatch(formData)
      if (res.success) {
         await fetchData()
         setEditingId(null)
         setIsAdding(false)
         setFormData({ sportName: '', team1: '', team2: '', score1: '0', score2: '0', status: 'live' })
      } else {
         alert(res.error)
      }
      setProcessing(false)
   }

   const handleDelete = async (id: string) => {
      if (!confirm('Purge this match record permanentely? This cannot be undone.')) return
      setProcessing(true)
      const res = await deleteMatch(id)
      if (res.success) {
         setMatches(matches.filter(m => m.id !== id))
      }
      setProcessing(false)
   }

   if (loading) {
      return (
         <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase opacity-50">Loading Matches...</p>
         </div>
      )
   }

   return (
      <div className="space-y-16 pb-20">
         <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="max-w-xl">
               <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground pb-1 leading-none">Match Scoring</h1>
               <p className="text-muted-foreground mt-6 text-xl font-medium opacity-80 leading-relaxed">
                  Manage ongoing matches, update live scores, and set team assignments.
               </p>
            </div>

            <Button
               onClick={() => setIsAdding(true)}
               className="px-6 py-3 text-sm font-semibold rounded-xl shadow-sm transition-all bg-blue-500 hover:bg-blue-600 border-0 text-white"
            >
               <Plus className="w-6 h-6 mr-4" /> Create Match
            </Button>
         </header>

         {isAdding && (
            <motion.div initial={{ opacity: 0, scale: 0.98, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-card p-8 rounded-2xl border border-border mb-14 shadow-sm mt-10">
               <h2 className="text-3xl font-bold mb-8">Match Details</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
                  <div className="space-y-4">
                     <label className="text-sm items-center flex gap-2 font-medium text-muted-foreground px-1">
                        <Trophy className="w-4 h-4" /> Sport
                     </label>
                     <select
                        className="w-full bg-background border border-input p-4 rounded-xl font-medium text-foreground outline-none focus:border-rose-500/50 appearance-none shadow-sm"
                        value={formData.sportName}
                        onChange={(e) => setFormData({ ...formData, sportName: e.target.value })}
                     >
                        <option value="" className="bg-card">Select Discipline</option>
                        {sports.map(s => <option key={s.id} value={s.name} className="bg-card">{s.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-4">
                     <label className="text-sm items-center flex gap-2 font-medium text-muted-foreground px-1">
                        <Sword className="w-4 h-4" /> Team 1
                     </label>
                     <Input
                        placeholder="Team 01 Name"
                        className="bg-background border-input p-4 rounded-xl font-medium focus:border-rose-500/50 text-base"
                        value={formData.team1}
                        onChange={(e: any) => setFormData({ ...formData, team1: e.target.value })}
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-sm items-center flex gap-2 font-medium text-muted-foreground px-1">
                        <Sword className="w-4 h-4 rotate-180" /> Team 2
                     </label>
                     <Input
                        placeholder="Team 02 Name"
                        className="bg-background border-input p-4 rounded-xl font-medium focus:border-rose-500/50 text-base"
                        value={formData.team2}
                        onChange={(e: any) => setFormData({ ...formData, team2: e.target.value })}
                     />
                  </div>
               </div>
               <div className="flex gap-4">
                  <Button className="flex-1 py-4 rounded-xl bg-blue-500 font-semibold text-white border-0 shadow-sm hover:bg-blue-600" onClick={() => handleSave(null)} disabled={processing}>
                     {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Creation'}
                  </Button>
                  <Button variant="outline" className="px-8 py-4 rounded-xl font-semibold border-border hover:bg-blue-500/10" onClick={() => setIsAdding(false)}>Cancel</Button>
               </div>
            </motion.div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <AnimatePresence mode="popLayout">
               {matches.map((m, i) => (
                  <motion.div
                     key={m.id}
                     initial={{ opacity: 0, scale: 0.95, x: -20 }}
                     animate={{ opacity: 1, scale: 1, x: 0 }}
                     transition={{ duration: 0.6, delay: i * 0.05, type: 'spring', damping: 20 }}
                  >
                     <Card className="bg-card border-border rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all duration-300 hover:shadow-md h-full">
                        <CardContent className="p-6 md:p-8">
                           {editingId === m.id ? (
                              <div className="space-y-8 animate-in fade-in slide-in-from-left-6 duration-500">
                                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                                    <h3 className="text-2xl font-bold">Update Score</h3>
                                    <div className="flex  p-1 rounded-lg border border-border shadow-sm">
                                       {['live', 'finished'].map(s => (
                                          <button
                                             key={s}
                                             onClick={() => setFormData({ ...formData, status: s })}
                                             className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all duration-300 ${formData.status === s ? 'bg-blue-900 text-white shadow-sm' : 'text-primary-foreground hover:bg-blue-800/50'}`}
                                          >
                                             {s}
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="flex items-center justify-center gap-8 p-6 rounded-2xl">
                                    <div className="flex-1 text-center space-y-3">
                                       <p className="text-sm font-bold ">{formData.team1}</p>
                                       <Input
                                          type="number"
                                          className="text-center text-5xl font-bold p-6 h-28 bg-background border-input rounded-xl focus:border-blue-500 shadow-sm"
                                          value={formData.score1}
                                          onChange={(e: any) => setFormData({ ...formData, score1: e.target.value })}
                                       />
                                    </div>
                                    <div className="text-xl font-bold text-muted-foreground self-center mt-6">VS</div>
                                    <div className="flex-1 text-center space-y-3">
                                       <p className="text-sm font-bold ">{formData.team2}</p>
                                       <Input
                                          type="number"
                                          className="text-center text-5xl font-bold p-6 h-28 bg-background border-input rounded-xl focus:border-blue-500 shadow-sm"
                                          value={formData.score2}
                                          onChange={(e: any) => setFormData({ ...formData, score2: e.target.value })}
                                       />
                                    </div>
                                 </div>
                                 <div className="flex gap-4 pt-2">
                                    <Button className="flex-1 py-4 bg-blue-500 rounded-xl font-semibold text-white border-0 shadow-sm hover:bg-blue-600" onClick={() => handleSave(m.id)} disabled={processing}>
                                       {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Score'}
                                    </Button>
                                    <Button variant="outline" className="px-8 py-4 rounded-xl font-semibold border-border hover:bg-accent" onClick={() => setEditingId(null)}>Cancel</Button>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex flex-col gap-8 transition-transform duration-300 h-full">
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                       <div>
                                          <div className="flex items-center gap-2">
                                             <span className={`text-xs font-bold uppercase ${m.status === 'live' ? 'text-blue-500' : 'text-muted-foreground'}`}>{m.status}</span>
                                             <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'live' ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground'}`} />
                                          </div>
                                          <h4 className="text-xl font-bold mt-1">{m.sportName}</h4>
                                       </div>
                                    </div>
                                    <div className="flex gap-2">
                                       <button onClick={() => handleEdit(m)} className="w-10 h-10 rounded-lg bg-background border border-border hover:bg-blue-500/10 hover:border-blue-500/30 text-muted-foreground hover:text-blue-500 transition-all duration-300 flex items-center justify-center shadow-sm">
                                          <Edit3 className="w-4 h-4" />
                                       </button>
                                       <button onClick={() => handleDelete(m.id)} className="w-10 h-10 rounded-lg bg-background border border-border hover:bg-blue-500/10 hover:border-blue-500/30 text-muted-foreground hover:text-blue-500 transition-all duration-300 flex items-center justify-center shadow-sm">
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </div>

                                 <div className="flex items-center justify-between px-6 py-8  border border-border rounded-2xl relative shadow-sm">
                                    <div className="flex flex-col items-center gap-3 relative w-[40%] text-center">
                                       <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center text-xl font-bold shadow-sm">{m.team1[0]}</div>
                                       <p className="text-sm font-semibold truncate w-full">{m.team1}</p>
                                       <span className="text-5xl font-bold tabular-nums text-foreground">{m.score1}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-2 relative">
                                       <div className="px-3 py-1 rounded-md bg-blue-500 text-[10px] font-bold text-white shadow-sm">VS</div>
                                       <div className="h-12 w-[1px] bg-border" />
                                    </div>

                                    <div className="flex flex-col items-center gap-3 relative w-[40%] text-center">
                                       <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center text-xl font-bold shadow-sm">{m.team2[0]}</div>
                                       <p className="text-sm font-semibold truncate w-full">{m.team2}</p>
                                       <span className="text-5xl font-bold tabular-nums text-foreground">{m.score2}</span>
                                    </div>
                                 </div>

                              </div>
                           )}
                        </CardContent>
                     </Card>
                  </motion.div>
               ))}
            </AnimatePresence>

            {matches.length === 0 && !isAdding && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-1 lg:col-span-2 text-center py-40 border border-border border-dashed rounded-2xl bg-secondary/5 relative overflow-hidden"
               >
                  <div className="w-24 h-24 bg-background border border-border rounded-xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                     <Target className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold">No Matches Live</h3>
                  <p className="text-muted-foreground text-sm font-medium mt-2">Create a new match to start broadcasting live scores.</p>
               </motion.div>
            )}
         </div>
      </div>
   )
}
