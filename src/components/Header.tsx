'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode';
import { Moon, Sun, UserPen, AlignRight, X, ChevronDown, LogOut, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getAdminNavLinks } from '@/lib/roles'
import LogoutModal from './ui/LogoutModal'
import Button from './ui/Button'

export default function Navbar() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [qrUrl, setQrUrl] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  const desktopRef = useRef(null)
  const adminRef = useRef(null)
  const mobileRef = useRef(null)

  const menuItems = ['Dashboard', 'Live Scores']
  const adminLinks = getAdminNavLinks(user?.role)
  const facilities = ['Book Court', 'Past-Bookings', 'RTO', 'SG' , 'Gym-bookings']

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

  const formatPath = (label: string) => '/' + label.toLowerCase().replace(/ /g, '-')
  const navigateTo = useCallback((path: string) => router.push(path), [router])

  const toggleMobile = () => {
    setMobileOpen(o => !o)
    setMobileDropdownOpen(false)
    setShowQr(false)
  }
  const toggleDesktopDropdown = () => setDesktopOpen(o => !o)
  const toggleAdminDropdown = () => setAdminOpen(o => !o)
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
    <nav className="fixed inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 dark:border-white/10 border-black/5 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-gradient-premium tracking-tighter">
              SportsBook
            </Link>
            <div className="hidden md:flex ml-10 space-x-6 items-center">
              {menuItems.map(item => (
                <button
                  key={item}
                  onClick={() => navigateTo(formatPath(item))}
                  className="px-3 py-2 cursor-pointer rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                >
                  {item}
                </button>
              ))}

              <div className="relative" ref={desktopRef}>
                <button
                  onClick={toggleDesktopDropdown}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
                >
                  Facilities <ChevronDown className="ml-1 w-4 h-4" />
                </button>
                <AnimatePresence>
                  {desktopOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute mt-2 w-48 glass-panel rounded-lg shadow-xl overflow-hidden"
                    >
                      {facilities.map(f => (
                        <Link
                          key={f}
                          href={formatPath(f)}
                          onClick={() => setDesktopOpen(false)}
                          className="block px-4 py-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          {f}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {adminLinks.length > 0 && (
                <div className="relative" ref={adminRef}>
                  <button
                    onClick={toggleAdminDropdown}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
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
                        className="absolute mt-2 w-56 glass-panel rounded-lg shadow-xl overflow-hidden"
                      >
                        {adminLinks.map(link => (
                          <Link
                            key={link.path}
                            href={link.path}
                            onClick={() => setAdminOpen(false)}
                            className="block px-4 py-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                          >
                            {link.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {user && (
                <div className="relative flex items-center">
                  <button
                    onClick={() => setShowQr(s => !s)}
                    className="px-4 py-2 rounded-lg text-sm cursor-pointer font-semibold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition shadow-[0_0_10px_-3px_var(--color-primary)]"
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
                        className="absolute left-0 top-full mt-2 w-48 h-48 flex items-center justify-center glass-panel rounded-xl z-50"
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
              onClick={toggleTheme}
              className="p-2 rounded-full border border-white/10 dark:border-white/10 border-black/5 bg-white/5 hover:bg-accent transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-secondary" />}
            </button>
            <button
              onClick={() => navigateTo(user ? '/profile' : '/login')}
              className="hidden md:flex items-center px-5 py-2 bg-foreground text-background font-semibold rounded-lg hover:bg-foreground/90 shadow-lg transition-all duration-300 cursor-pointer"
            >
              {user ? <UserPen className="w-5 h-5" /> : 'Login'}
            </button>
            {user && (
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="hidden md:flex h-10 items-center gap-2 px-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 cursor-pointer font-semibold text-sm"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={toggleMobile}
              className="md:hidden p-2 rounded-md focus:outline-none text-foreground hover:bg-white/10"
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
            className="md:hidden glass-panel border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-6 space-y-2 max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
              {menuItems.map(item => (
                <button
                  key={item}
                  onClick={() => {
                    navigateTo(formatPath(item));
                    setMobileOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  {item}
                </button>
              ))}

              <div className="relative" ref={mobileRef}>
                <button
                  onClick={toggleMobileDropdown}
                  className="w-full flex justify-between items-center px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-primary hover:bg-primary/10"
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
                          key={f}
                          href={formatPath(f)}
                          onClick={() => setMobileOpen(false)}
                          className="block px-3 py-2 text-sm text-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                        >
                          {f}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {adminLinks.map(link => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm text-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                >
                  {link.name}
                </Link>
              ))}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowQr(s => !s)}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-primary/10"
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
                        className="mt-2 flex justify-center py-4 bg-black/40 rounded-lg"
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
                className="mt-4 block w-full text-center px-3 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_var(--color-primary)] text-white font-bold cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
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
