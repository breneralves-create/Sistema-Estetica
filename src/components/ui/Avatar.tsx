import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback: string
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary-light", className)}
        {...props}
      >
        {src ? (
          <img src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-primary font-medium">
            {fallback}
          </span>
        )}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'
