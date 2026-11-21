"use client";
import { motion } from "framer-motion";
export default function Button({
    className, variant = "primary", size = "md", children, type = "button", ...props
}: { className?: string; variant?: string; size?: string; children?: React.ReactNode; [key: string]: any }) {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<string, string> = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        outline: "border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        glow: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    };

    const sizes: Record<string, string> = {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-8 py-2 text-sm",
        lg: "h-14 px-8 text-base",
    };

    const variantStyles = variants[variant] || variants.primary;
    const sizeStyles = sizes[size] || sizes.md;

    return (
        <motion.button
            type={type}
            className={`${baseStyles} ${variantStyles} ${sizeStyles}  cursor-pointer ${className || ""}`}
            {...props}
        >
            {children}
        </motion.button>
    );
}
