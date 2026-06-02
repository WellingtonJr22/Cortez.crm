import * as React from "react"

import { cn } from "@/lib/utils"

/** @typedef {import('react').InputHTMLAttributes<HTMLInputElement>} InputProps */

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
    return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
