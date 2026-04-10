import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-[#494fdf]/20 text-[#7b80f0] border border-[#494fdf]/30',
        secondary:   'bg-[rgba(255,255,255,0.06)] text-[#8d969e] border border-[rgba(255,255,255,0.08)]',
        destructive: 'bg-[#e23b4a]/15 text-[#e23b4a] border border-[#e23b4a]/25',
        success:     'bg-[#00a87e]/15 text-[#00a87e] border border-[#00a87e]/25',
        warning:     'bg-[#ec7e00]/15 text-[#ec7e00] border border-[#ec7e00]/25',
        outline:     'border border-[rgba(255,255,255,0.12)] text-[#8d969e]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
