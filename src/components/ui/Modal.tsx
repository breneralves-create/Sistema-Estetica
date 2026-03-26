import { HTMLAttributes, ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children, className, ...props }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div 
        className={cn(
          "relative w-full max-w-lg rounded-[16px] bg-base p-6 shadow-modal animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        {...props}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
        {title && <h2 className="text-2xl font-serif font-semibold mb-4 text-main">{title}</h2>}
        <div className="text-main">
          {children}
        </div>
      </div>
    </div>
  )
}
