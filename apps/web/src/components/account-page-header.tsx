import { type ReactNode } from 'react';

export function AccountPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">{eyebrow}</p>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
      </div>
      {action}
    </div>
  );
}
