import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={clsx(
            'w-full px-4 py-3 rounded-xl border bg-white text-zinc-900 text-sm',
            'placeholder:text-zinc-400 outline-none transition',
            'focus:ring-2 focus:ring-black focus:border-transparent',
            error ? 'border-red-400' : 'border-zinc-200',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
