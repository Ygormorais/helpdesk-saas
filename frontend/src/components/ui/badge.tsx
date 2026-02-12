import React from 'react'

type BadgeProps = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent'
  className?: string
}

// Simple Badge component used in landing page
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    accent: 'bg-pink-100 text-pink-800',
  } as const

  const cl = [base, variantClasses[variant], className].filter(Boolean).join(' ')
  return <span className={cl}>{children}</span>
}

export default Badge
