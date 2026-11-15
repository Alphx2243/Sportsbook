'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, X } from 'lucide-react'

export default function LogoutModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-sm overflow-hidden bg-card text-card-foreground backdrop-blur-xl rounded-xl shadow-2xl border border-border mx-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="h-1.5 bg-red-500" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                            <LogOut className="text-red-500" size={32} />
                        </div>

                        <h3 className="text-2xl font-bold text-foreground mb-2">
                            Ready to leave?
                        </h3>
                        <p className="text-muted-foreground mb-8 px-2">
                            Are you sure you want to log out? You&apos;ll need to log back in to access your bookings.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-lg font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="px-6 py-3 rounded-lg font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 hover:shadow-red-500/30 transition-all duration-200"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
