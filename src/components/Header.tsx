'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode';
import { UserPen, AlignRight, X, ChevronDown, LogOut, Shield, Building2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getGymBookings } from '@/actions/gym'
import { getAdminNavLinks, normalizeRole, ROLES } from '@/lib/roles'
import LogoutModal from './ui/LogoutModal'
import Button from './ui/Button'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const [qrUrl, setQrUrl] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [hasActiveGymSession, setHasActiveGymSession] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  const desktopRef = useRef(null)
  const adminRef = useRef(null)
  const mobileRef = useRef(null)

  // 'Live Scores' is retained for its planned launch.
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Feedback', path: '/feedback' },
  ]
  const adminLinks = getAdminNavLinks(user?.role)
  // 'SG' is retained for its planned launch.
  const facilities = [
    { name: 'Book a court', path: '/book-court' },
    { name: 'Booking history', path: '/past-bookings' },
    { name: 'Facility occupancy', path: '/rto' },
    { name: 'Gym bookings', path: '/gym-bookings' },
  ]
  const isGuard = normalizeRole(user?.role) === ROLES.GUARD

  useEffect(() => {
    const generateQR = async () => {
    if (!user) return;

    const qrData = user.id;

    try {
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
      });

      setQrUrl(dataUrl);
    } catch (error) {
      console.error("Failed to generate QR:", error);
    }
  };

  generateQR();
  }, [user])

  useEffect(() => {
    if (!user || isGuard) {
      setHasActiveGymSession(false)
      return
    }

    const checkGymSession = async () => {
      const response = await getGymBookings(user.id)
      if (response.success) {
        const isActive = response.data.documents.some((session: any) => session.status === 'active' && !session.exitTime)
        setHasActiveGymSession(isActive)
        if (isActive) setShowQr(false)
      }
    }

    checkGymSession()
    const interval = window.setInterval(checkGymSession, 5_000)
    return () => window.clearInterval(interval)
  }, [user, isGuard])

  const navigateTo = useCallback((path: string) => router.push(path), [router])

  const toggleMobile = () => {
    setMobileOpen(o => !o)
    setMobileDropdownOpen(false)
    setShowQr(false)
  }
  const toggleDesktopDropdown = () => {
    setDesktopOpen(o => !o)
    setAdminOpen(false)
    setShowQr(false)
  }
  const toggleAdminDropdown = () => {
    setAdminOpen(o => !o)
    setDesktopOpen(false)
    setShowQr(false)
  }
  const toggleMobileDropdown = () => setMobileDropdownOpen(o => !o)

  const handleLogout = async () => {
    await logout()
    setLogoutModalOpen(false)
    window.location.href = '/'
  }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (desktopRef.current && !(desktopRef.current as any).contains(e.target)) {
        setDesktopOpen(false)
      }
      if (adminRef.current && !(adminRef.current as any).contains(e.target)) {
        setAdminOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (mobileRef.current && !(mobileRef.current as any).contains(e.target)) {
        setMobileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center">
            <Link href="/dashboard" className="shrink-0 text-xl font-bold tracking-tight text-foreground">
              SportsBook
            </Link>
            <div className="hidden lg:flex ml-8 gap-1 items-center">
              {!isGuard && menuItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className={`px-3 py-2 cursor-pointer rounded-md text-sm font-medium transition-colors ${pathname === item.path ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  {item.name}
                </button>
              ))}

              {!isGuard && <div className="relative" ref={desktopRef}>
                <button
                  onClick={toggleDesktopDropdown}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${facilities.some(item => pathname === item.path) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                  <Building2 className="mr-1.5 w-4 h-4" /> Facilities <ChevronDown className="ml-1 w-4 h-4" />
                </button>
                <AnimatePresence>
                  {desktopOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 z-50 mt-2 bg-white max-h-[calc(100vh-5rem)] w-52 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
                    >
                      {facilities.map(f => (
                        <Link
                          key={f.path}
                          href={f.path}
                          onClick={() => setDesktopOpen(false)}
                          className={`block rounded-md px-3 py-2 text-sm transition-colors cursor-pointer ${pathname === f.path ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent'}`}
                        >
                          {f.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>}
              {adminLinks.length > 0 && (
                <div className="relative" ref={adminRef}>
                  <button
                    onClick={toggleAdminDropdown}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${pathname.startsWith('/admin') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    <Shield className="mr-1.5 w-4 h-4" />
                    Admin <ChevronDown className="ml-1 w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {adminOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      className="absolute bg-white right-0 z-50 mt-2 max-h-[calc(100vh-5rem)] w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
                      >
                        {adminLinks.map(link => (
                          <Link
                            key={link.path}
                            href={link.path}
                            onClick={() => setAdminOpen(false)}
                            className={`block rounded-md px-3 py-2 text-sm transition-colors cursor-pointer ${pathname === link.path ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent'}`}
                          >
                            {link.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {user && !isGuard && !hasActiveGymSession && (
                <div className="relative flex items-center">
                  <button
                    onClick={() => setShowQr(s => !s)}
                    className="px-3 py-2 rounded-md text-sm cursor-pointer font-semibold text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
                  >
                    Gym QR
                  </button>
                  <AnimatePresence>
                    {showQr && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="absolute left-0 top-full mt-2 w-48 h-48 flex items-center justify-center rounded-lg border border-border bg-popover p-3 shadow-lg z-50"
                      >
                        {qrUrl ? (
                          <Image
                            src={qrUrl}
                            alt="QR Code"
                            width={160}
                            height={160}
                            className="h-[160px] w-[160px] object-contain rounded-lg"
                          />
                        ) : (
                          <p className="text-sm text-gray-400">Loading QR...</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateTo(user ? '/profile' : '/login')}
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 shadow-sm transition-colors cursor-pointer"
            >
              {user && <UserPen className="w-4 h-4" />}{user ? 'Profile' : 'Login'}
            </button>
            {user && (
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="hidden lg:flex h-9 items-center gap-2 px-2 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer font-medium text-sm"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={toggleMobile}
            className="lg:hidden p-2 rounded-md focus:outline-none text-foreground hover:bg-accent"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <AlignRight className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-border bg-background shadow-lg overflow-hidden"
          >
            <div className="px-4 pt-4 pb-6 space-y-2 max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
              {!isGuard && menuItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigateTo(item.path);
                    setMobileOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium ${pathname === item.path ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                >
                  {item.name}
                </button>
              ))}

              {!isGuard && <div className="relative" ref={mobileRef}>
                <button
                  onClick={toggleMobileDropdown}
                  className="w-full flex justify-between items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  Facilities <ChevronDown className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {mobileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mt-1 space-y-1 pl-4"
                    >
                      {facilities.map(f => (
                        <Link
                          key={f.path}
                          href={f.path}
                          onClick={() => setMobileOpen(false)}
                          className={`block px-3 py-2 text-sm rounded-md ${pathname === f.path ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent'}`}
                        >
                          {f.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>}
              {adminLinks.map(link => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-md ${pathname === link.path ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent'}`}
                >
                  {link.name}
                </Link>
              ))}
              {user && !isGuard && !hasActiveGymSession && (
                <div className="relative">
                  <button
                    onClick={() => setShowQr(s => !s)}
                    className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10"
                  >
                    Gym QR
                  </button>
                  <AnimatePresence>
                    {showQr && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="mt-2 flex justify-center py-4 bg-accent rounded-lg"
                      >
                        {qrUrl ? (
                          <Image
                            src={qrUrl}
                            alt="QR Code"
                            width={150}
                            height={150}
                            className="h-[150px] w-[150px] object-contain rounded"
                          />
                        ) : (
                          <p className="text-gray-500">Loading QR...</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <button
                onClick={() => {
                  navigateTo(user ? '/profile' : '/login')
                  setMobileOpen(false)
                }}
                className="mt-4 block w-full text-center px-3 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-white font-semibold cursor-pointer transition-colors"
              >
                {user ? 'Edit Profile' : 'Login'}
              </button>
              {user && (
                <Button
                  variant="danger"
                  size="md"
                  className="mt-2 w-full h-12 flex items-center justify-center gap-2"
                  onClick={() => setLogoutModalOpen(true)}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </nav>
  )
}
