import React from 'react'

// Minimal ScrollArea component to satisfy existing imports
// It simply provides a scrollable container.
export const ScrollArea: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`overflow-auto ${className}`}>
      {children}
    </div>
  )
}

export default ScrollArea
