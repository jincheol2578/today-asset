import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#494fdf] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191c1f] disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        default:     'bg-[#494fdf] text-white hover:bg-[#3d43c7] active:scale-[0.98]',
        destructive: 'bg-[#e23b4a] text-white hover:bg-[#c73040] active:scale-[0.98]',
        outline:     'border border-[rgba(255,255,255,0.12)] bg-transparent text-[#f4f4f4] hover:bg-[rgba(255,255,255,0.05)]',
        ghost:       'bg-transparent text-[#8d969e] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f4f4f4]',
        secondary:   'bg-[#1e2227] text-[#f4f4f4] hover:bg-[#252a30] border border-[rgba(255,255,255,0.07)]',
        success:     'bg-[#00a87e] text-white hover:bg-[#009970] active:scale-[0.98]',
        link:        'text-[#494fdf] underline-offset-4 hover:underline rounded-none',
      },
      size: {
        default: 'h-10 px-6 py-2.5',
        sm:      'h-8 px-4 text-xs',
        lg:      'h-12 px-8 text-base',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
