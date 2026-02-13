import React from 'react';

// Minimal ScrollArea component to satisfy existing imports.
// It simply provides a scrollable container, but forwards the ref
// so consumers can manage scroll position.
export const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return <div ref={ref} className={`overflow-auto ${className}`} {...props} />;
  }
);

ScrollArea.displayName = 'ScrollArea';

export default ScrollArea;
