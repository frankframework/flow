import clsx from 'clsx'

interface LoadingSpinnerProperties {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export default function LoadingSpinner({ size = 'md', message, className }: Readonly<LoadingSpinnerProperties>) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <div className={clsx('border-border border-t-brand animate-spin rounded-full', sizeClasses[size])} />
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  )
}
