import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          {
            // variants
            'bg-black text-white hover:bg-zinc-800 focus-visible:ring-black':
              variant === 'primary',
            'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus-visible:ring-zinc-400':
              variant === 'secondary',
            'bg-transparent text-zinc-700 hover:bg-zinc-100 focus-visible:ring-zinc-300':
              variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500':
              variant === 'danger',
            // sizes
            'text-sm px-3 py-1.5': size === 'sm',
            'text-sm px-4 py-2.5': size === 'md',
            'text-base px-6 py-3': size === 'lg',
            // disabled/loading
            'opacity-50 cursor-not-allowed': disabled || loading,
          },
          className,
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
