import React from 'react'

type ProgressProps = {
  value: number
  className?: string
}

// Simple horizontal progress bar
export const Progress: React.FC<ProgressProps> = ({ value, className = '' }) => {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`w-full h-2 bg-gray-200 rounded-full ${className}`}>
      <div
        className="h-2 rounded-full bg-primary"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default Progress
