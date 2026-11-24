import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const alertVariants = cva('relative w-full rounded-xl border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      destructive: 'border-red-200 bg-red-50 text-red-800',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role={variant === 'destructive' ? 'alert' : undefined}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert };
