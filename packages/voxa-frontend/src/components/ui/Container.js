// components/Container.jsx

import React from "react";

const Container = React.forwardRef(
  ({ children, className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`container mx-auto max-w-custom py-8 px-6 flex flex-col items-start gap-6 rounded-[var(--radius)] border border-border bg-card shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
Container.displayName = "Container";

export default Container;
