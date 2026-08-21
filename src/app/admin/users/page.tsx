'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Trash2, User as UserIcon,
  Loader2
} from 'lucide-react'
import { getAllUsers, updateUserRole, deleteUser } from '@/actions/admin'
import { User } from '@/interfaces'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { normalizeRole, ROLE_LABELS, ROLE_OPTIONS } from '@/lib/roles'


export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const res = await getAllUsers()
    if (res.success) setUsers(res.data)
    setLoading(false)
  }
  const handleRoleChange = async (userId: string, newRole: string) => {
    setProcessingId(userId)
    const res = await updateUserRole(userId, newRole)
    if(res.success){
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } else {
      alert(`Role update failed: ${res.error}`)
    }
    setProcessingId(null)
  }


  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to terminate this account? This action is permanent and all associated data will be purged.')) return
    setProcessingId(userId)
    const res = await deleteUser(userId)
    if (res.success) {
      setUsers(users.filter(u => u.id !== userId))
    } else {
      alert(`Deletion failed: ${res.error}`)
    }
    setProcessingId(null)
  }

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.rollNumber?.toLowerCase().includes(search.toLowerCase())
  )
  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase opacity-50">Loading Users...</p>
      </div>
    )
  }

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-widest border border-blue-500/20">
              User data
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground pb-1 leading-none">Users</h1>
          <p className="text-muted-foreground mt-1 text-xl font-medium opacity-80 leading-relaxed">
            Manage users
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative w-full md:w-[350px] group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-all duration-300">
              <Search className="w-full h-full" />
            </div>
            <Input
              placeholder="Search users..."
              className="pl-14 pr-4 py-6 bg-background border-input rounded-xl focus:border-primary/50 transition-all font-medium text-base shadow-sm"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, delay: i * 0.03, type: 'spring', damping: 20 }}
            >
              <Card className="bg-card border-border rounded-2xl overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row items-center gap-6">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center border transition-all duration-300 ${normalizeRole(u.role) === 'Admin' ? 'bg-primary/100 border-primary/20 text-primary shadow-sm' : 'bg-primary/100 border-border text-primary-foreground'}`}>
                        <UserIcon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-2xl font-bold truncate">{u.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase shadow-sm ${normalizeRole(u.role) === 'Admin' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-primary text-primary-foreground border border-border'}`}>
                            {ROLE_LABELS[normalizeRole(u.role)]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground/60 w-10">Email</span> {u.email}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground/60 w-8">Roll</span> {u.rollNumber}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground/60 w-12">Joined</span> {new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(u.createdAt))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-border">
                      <select
                        className="h-12 rounded-lg bg-background border border-border px-3 text-sm font-semibold outline-none focus:border-primary/50"
                        value={normalizeRole(u.role)}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(u.id, e.target.value)}
                        disabled={processingId === u.id}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-card">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-12 h-12 rounded-lg hover:bg-destructive/10 hover:text-destructive group/del border border-border hover:border-destructive/20 transition-all duration-200 bg-background"
                        onClick={() => handleDelete(u.id)}
                        disabled={processingId === u.id}
                      >
                        <Trash2 className="w-5 h-5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredUsers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-40 border border-border border-dashed rounded-2xl bg-secondary/5"
          >
            <div className="w-20 h-20 bg-background border border-border rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold">No Users Found</h3>
            <p className="text-muted-foreground text-sm font-medium mt-2">Search yields zero matches.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

