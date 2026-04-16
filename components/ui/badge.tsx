import { clsx } from 'clsx'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'zinc'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'zinc', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      {
        'bg-emerald-50 text-emerald-700': variant === 'green',
        'bg-amber-50 text-amber-700':    variant === 'yellow',
        'bg-red-50 text-red-700':        variant === 'red',
        'bg-blue-50 text-blue-700':      variant === 'blue',
        'bg-zinc-100 text-zinc-600':     variant === 'zinc',
      },
      className,
    )}>
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    active: 'green', confirmed: 'green', approved: 'green', booked: 'green', completed: 'green',
    pending: 'yellow', waiting: 'yellow',
    cancelled: 'red', rejected: 'red', suspended: 'red', no_show: 'red', expired: 'red',
  }
  return <Badge variant={map[status] ?? 'zinc'}>{status}</Badge>
}
