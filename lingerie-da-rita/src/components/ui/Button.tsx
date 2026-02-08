import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark shadow-sm',
  secondary: 'bg-surface text-text border border-border hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-danger text-white hover:bg-red-700 active:bg-red-800',
  success: 'bg-success text-white hover:bg-green-700 active:bg-green-800',
  ghost: 'text-text-light hover:bg-surface active:bg-gray-200',
}

const sizes = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-3 text-base min-h-[44px]',
  lg: 'px-6 py-4 text-lg min-h-[52px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        rounded-xl transition-all duration-150 select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      {children}
    </button>
  )
}
