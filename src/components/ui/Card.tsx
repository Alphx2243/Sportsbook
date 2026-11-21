"use client";

interface CardProps {
    className?: string;
    children?: React.ReactNode;
    [key: string]: any;
}

export function Card({ className, children, ...props }: CardProps) {
    return (
        <div
            className={`glass-card rounded-xl overflow-hidden ${className || ""}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...props }: CardProps) {
    return (
        <div className={`p-6 pb-2 ${className || ""}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children, ...props }: CardProps) {
    return (
            <h3 className={`text-xl font-semibold leading-tight tracking-tight text-foreground mb-2 ${className || ""}`} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({ className, children, ...props }: CardProps) {
    return (
            <p className={`text-sm text-muted-foreground ${className || ""}`} {...props}>
            {children}
        </p>
    );
}

export function CardContent({ className, children, ...props }: CardProps) {
    return (
        <div className={`p-6 pt-2 ${className || ""}`} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children, ...props }: CardProps) {
    return (
        <div className={`flex items-center p-6 pt-0 ${className || ""}`} {...props}>
            {children}
        </div>
    );
}
