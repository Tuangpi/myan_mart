import { Minus, Plus } from 'lucide-react';
import { Button } from './ui/button';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  label: string;
  onChange: (quantity: number) => void;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled = false,
  label,
  onChange,
}: QuantityStepperProps) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className="inline-flex items-center rounded-xl border border-border bg-card p-1 shadow-xs"
      aria-label={label}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || value <= min}
        onClick={decrease}
        aria-label={`${label} decrease`}
      >
        <Minus className="size-4" />
      </Button>
      <span className="min-w-9 px-1 text-center text-sm font-bold tabular-nums">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || value >= max}
        onClick={increase}
        aria-label={`${label} increase`}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
