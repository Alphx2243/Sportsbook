'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import Button from './Button'

export default function ErrorModal({ isOpen, onClose, title = "Error", message }: { isOpen?: boolean; onClose: () => void; title?: string; message: string }) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-sm p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden text-center bg-card/80"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                    <AlertCircle className="text-red-500 w-8 h-8" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                    {title}
                </h3>
                <p className="text-gray-400 mb-8 px-2 leading-relaxed">
                    {message}
                </p>

                <Button
                    variant="primary"
                    className="w-full py-4 text-base font-bold shadow-lg shadow-primary/20"
                    onClick={onClose}
                >
                    Got it, thanks!
                </Button>
            </motion.div>
        </div>
    )
}
