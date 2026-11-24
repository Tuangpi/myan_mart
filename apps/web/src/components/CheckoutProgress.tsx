import { Check, CreditCard, MapPin, ShoppingCart } from 'lucide-react';
import { useI18n } from '@myanmart/shared';

export function CheckoutProgress() {
  const { t } = useI18n();
  const steps = [
    { label: t('cart.title'), icon: ShoppingCart, complete: true },
    { label: t('checkout.address'), icon: MapPin, complete: false },
    { label: t('checkout.payment'), icon: CreditCard, complete: false },
  ];

  return (
    <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Checkout progress">
      {steps.map(({ label, icon: Icon, complete }, index) => (
        <li
          key={label}
          className="flex min-w-0 items-center gap-2 text-xs font-semibold sm:text-sm"
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full ${index === 1 ? 'bg-primary text-primary-foreground' : complete ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
          </span>
          <span className={index === 1 ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
