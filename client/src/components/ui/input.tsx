import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#1e2227] px-4 py-2 text-sm text-[#f4f4f4] placeholder:text-[#505a63] transition-colors focus-visible:outline-none focus-visible:border-[#494fdf] focus-visible:ring-1 focus-visible:ring-[#494fdf] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
