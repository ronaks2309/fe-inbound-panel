import * as React from "react"
// Since we didn't install @radix-ui/react-avatar, we will implement a simple version
// or I should install it?
// User said "Prefer best design practices... shadcn/ui". Shadcn uses radix.
// I should probably install radix-ui primitives if I want to be true to shadcn.
// But valid HTML/CSS is also fine.
// The user installed lucide-react etc.
// I'll stick to pure React/Tailwind for simplicity unless complexity demands Radix.
// Avatar is simple enough: Circle > Image (fallback to Text).

import { cn } from "../../lib/utils"

const Avatar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className
        )}
        {...props}
    />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
    HTMLImageElement,
    React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => (
    <img
        ref={ref}
        className={cn("aspect-square h-full w-full", className)}
        {...props}
    />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-full w-full items-center justify-center rounded-full bg-muted",
            className
        )}
        {...props}
    />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
