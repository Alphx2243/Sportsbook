'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    CheckCircle2,
    AlertCircle, Camera, Info,
    QrCode, Upload
} from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { activateBooking } from '@/actions/bookings'
import jsQR from 'jsqr'

export default function BookingScannerPage() {
    const [isScanning, setIsScanning] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState('')
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
            }
        }
    }, [])

    const startScanner = async () => {
        if (isScanning || isProcessing) return
        setIsScanning(true)
        setError('')
        setResult(null)

        setTimeout(() => {
            const scanner = createQrScanner("reader")
            scannerRef.current = scanner
            scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                onScanSuccess,
                onScanFailure
            ).catch(err => {
                console.error("Scanner start error:", err)
                setError("Could not access camera. Please check permissions.")
                scannerRef.current = null
                setIsScanning(false)
            })
        }, 100)
    }

    const stopScanner = async () => {
        if (scannerRef.current?.isScanning) {
             try {
                await scannerRef.current.stop()
            } catch (err) {
                console.error("Scanner stop error:", err)
            }
        }
        scannerRef.current = null
        setIsScanning(false)
    }

    const onScanSuccess = async (decodedText: string) => {
        await stopScanner()
        processScannedData(decodedText)
    }

    const onScanFailure = (error: string) => {
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsProcessing(true)
        setError('')
        setResult(null)

        const html5QrCode = createQrScanner("reader-hidden")
        try {
            const decodedText = await decodeQrImage(html5QrCode, file)
            await processScannedData(decodedText)
        } catch (err) {
            console.error("QR Upload Error:", err)
            setError("Could not read a booking QR from this image. Upload a clear screenshot/crop of the booking QR, or use the camera scanner.")
        } finally {
            setIsProcessing(false)
            try {
                html5QrCode.clear()
            } catch {
            }
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const processScannedData = async (data: string) => {
        setIsProcessing(true)
        setError('')
        try {
            const res = await activateBooking(data)
            if (res.success) {
                setResult(res.data)
            } else {
                setError(res.error || 'Failed to activate booking')
            }
        } catch (err) {
            setError('An unexpected error occurred')
            console.error(err)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <main className="min-h-screen bg-background text-foreground py-24 px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-16">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-3xl mb-6 border border-primary/20 shadow-[0_0_30px_-5px_var(--color-primary)]"
                    >
                        <QrCode className="text-primary w-12 h-12" />
                    </motion.div>
                    <h1 className="text-5xl font-black text-gradient-premium tracking-tighter mb-4 italic text-gradient">
                        Booking Activator
                    </h1>
                    <p className="text-gray-400 text-lg font-medium max-w-2xl mx-auto">
                        Scan player QR codes to start their session timers and track attendance.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="glass-panel p-2 rounded-[2rem] border border-white/10 shadow-3xl overflow-hidden aspect-square relative group"
                    >
                        {!isScanning ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6">
                                <div className="p-8 rounded-full bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                    <Camera className="w-16 h-16 text-primary/40" />
                                </div>
                                <button 
                                    onClick={startScanner}
                                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    Activate Camera
                                </button>
                                <div className="flex flex-col items-center gap-2">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 text-primary/60 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload QR Image
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full h-full rounded-[1.8rem] overflow-hidden bg-black">
                                <div id="reader" className="w-full h-full"></div>
                                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                                    <div className="w-full h-full border-2 border-primary animate-pulse rounded-lg shadow-[0_0_30px_var(--color-primary)]" />
                                </div>
                                <button 
                                    onClick={stopScanner}
                                    className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg"
                                >
                                    Cancel Scan
                                </button>
                            </div>
                        )}
                    </motion.div>

                    <div className="space-y-8">
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
                                <Info className="w-5 h-5 text-primary" />
                                Secure QR Only
                            </h3>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-medium text-gray-400">
                                Booking activation requires the signed booking QR. Booking IDs and manually typed text are not accepted.
                            </div>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-400"
                                >
                                    <AlertCircle className="w-6 h-6 shrink-0" />
                                    <p className="font-bold text-sm">{error}</p>
                                </motion.div>
                            )}

                            {result && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0, scale: 0.9 }}
                                    animate={{ height: 'auto', opacity: 1, scale: 1 }}
                                    className="bg-green-500/10 border border-green-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute -right-8 -top-8 opacity-5">
                                        <CheckCircle2 className="w-32 h-32 text-green-500" />
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-green-500/20 rounded-2xl text-green-400">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white italic">Activation Success!</h3>
                                            <p className="text-green-500/60 text-xs font-bold uppercase tracking-widest">Session Started</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Sport</span>
                                            <span className="font-black text-white">{result.sportName}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Court</span>
                                            <span className="font-black text-primary">#{result.courtNo}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <p className="text-gray-500 text-[10px] uppercase font-black mb-1">Start</p>
                                                <p className="font-bold text-lg">{result.startTime}</p>
                                            </div>
                                            <div className="p-4 bg-primary/20 rounded-2xl border border-primary/20">
                                                <p className="text-primary/60 text-[10px] uppercase font-black mb-1">End</p>
                                                <p className="font-bold text-lg text-primary">{result.endTime}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <div
                id="reader-hidden"
                className="fixed -left-[9999px] top-0 h-[420px] w-[420px] overflow-hidden opacity-0 pointer-events-none"
            ></div>
        </main>
    )
}

function createQrScanner(elementId: string) {
    return new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: true,
        verbose: false,
    })
}

async function decodeQrImage(scanner: Html5Qrcode, file: File) {
    const jsQrDetected = await decodeWithJsQr(file)
    if (jsQrDetected) return jsQrDetected

    const browserDetected = await decodeWithBrowserBarcodeDetector(file)
    if (browserDetected) return browserDetected

    try {
        return await scanner.scanFile(file, true)
    } catch (originalError) {
        const preparedFiles = await prepareImageVariantsForQrScan(file)
        for (const preparedFile of preparedFiles) {
            const jsQrVariantDetected = await decodeWithJsQr(preparedFile)
            if (jsQrVariantDetected) return jsQrVariantDetected

            const detected = await decodeWithBrowserBarcodeDetector(preparedFile)
            if (detected) return detected

            try {
                return await scanner.scanFile(preparedFile, true)
            } catch {
            }
        }
        throw originalError
    }
}

async function decodeWithJsQr(file: File) {
    const imageData = await fileToImageData(file)
    if (!imageData) return null

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
    })

    return code?.data || null
}

async function fileToImageData(file: File) {
    const bitmap = await createImageBitmap(file).catch(() => null)
    if (!bitmap) return null

    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    context.drawImage(bitmap, 0, 0)
    return context.getImageData(0, 0, canvas.width, canvas.height)
}

async function prepareImageVariantsForQrScan(file: File) {
    const bitmap = await createImageBitmap(file).catch(() => null)
    if (!bitmap) return []

    const variants: File[] = []
    const fullImage = await renderBitmapToFile(bitmap, 2400)
    if (fullImage) variants.push(fullImage)

    const centerCrop = await renderBitmapCropToFile(bitmap, 0.15, 0.15, 0.7, 0.7, 1800)
    if (centerCrop) variants.push(centerCrop)

    const lowerCrop = await renderBitmapCropToFile(bitmap, 0, 0.2, 1, 0.8, 2200)
    if (lowerCrop) variants.push(lowerCrop)

    return variants
}

async function decodeWithBrowserBarcodeDetector(file: File) {
    const BarcodeDetectorCtor = (window as WindowWithBarcodeDetector).BarcodeDetector
    if (!BarcodeDetectorCtor) return null

    const bitmap = await createImageBitmap(file).catch(() => null)
    if (!bitmap) return null

    try {
        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] })
        const results = await detector.detect(bitmap)
        return results[0]?.rawValue || null
    } catch {
        return null
    }
}

async function renderBitmapToFile(bitmap: ImageBitmap, targetSide: number) {
    return renderBitmapCropToFile(bitmap, 0, 0, 1, 1, targetSide)
}

async function renderBitmapCropToFile(
    bitmap: ImageBitmap,
    xRatio: number,
    yRatio: number,
    widthRatio: number,
    heightRatio: number,
    targetSide: number
) {
    const sourceX = Math.round(bitmap.width * xRatio)
    const sourceY = Math.round(bitmap.height * yRatio)
    const sourceWidth = Math.round(bitmap.width * widthRatio)
    const sourceHeight = Math.round(bitmap.height * heightRatio)
    const scale = targetSide / Math.max(sourceWidth, sourceHeight)
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return null

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.imageSmoothingEnabled = false
    context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return null

    return new File([blob], 'booking-qr.png', { type: 'image/png' })
}

type WindowWithBarcodeDetector = Window & {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
    }
}
