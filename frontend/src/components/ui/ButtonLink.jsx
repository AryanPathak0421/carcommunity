import { Link } from 'react-router-dom'

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]'

  const styles = {
    primary:
      'bg-gradient-to-r from-brand-bright to-brand text-white shadow-[0_12px_40px_-12px_rgba(249,115,22,0.45)] hover:brightness-[1.05]',
    secondary:
      'border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50',
    ghost: 'text-slate-900 bg-white hover:bg-slate-50 shadow-sm ring-1 ring-slate-200/80',
  }

  const combinedClassName = `${base} ${styles[variant]} ${className}`

  if (href.startsWith('http') || href.startsWith('#')) {
    return (
      <a href={href} className={combinedClassName} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <Link to={href} className={combinedClassName} {...rest}>
      {children}
    </Link>
  )
}
