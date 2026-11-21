"use client";

import { motion } from "framer-motion";

export default function Input({ className, ...props }: { className?: string; [key: string]: any }) {
    return (
        <motion.input
            className={`flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground transition-colors duration-150 ${className || ""}`}
            {...props}
        />
    );
}
