import { useI18n } from '@myanmart/shared';
import { I18nLayout } from '../layouts/I18nLayout';
import { useAuth } from '../contexts/auth-context';
import { AccountPageHeader } from '../components/account-page-header';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function ProfilePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <I18nLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <AccountPageHeader eyebrow={t('account.title')} title={t('account.profile')} description={t('account.profileDescription')} />
        <Card>
          <CardHeader><CardTitle>{t('account.details')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <p><span className="block text-sm text-muted-foreground">{t('auth.name')}</span>{user?.name}</p>
            <p><span className="block text-sm text-muted-foreground">{t('auth.email')}</span>{user?.email}</p>
            <p><span className="block text-sm text-muted-foreground">{t('auth.phone')}</span>{user?.phone || t('account.notProvided')}</p>
            <p><span className="block text-sm text-muted-foreground">{t('account.role')}</span><Badge>{user?.role}</Badge></p>
          </CardContent>
        </Card>
        {user?.store && <Card><CardHeader><CardTitle>{t('account.store')}</CardTitle></CardHeader><CardContent><p className="font-semibold">{user.store.name}</p><p className="mt-1"><Badge variant="success">{t(`sellerProducts.${user.store.status}`)}</Badge></p></CardContent></Card>}
      </div>
    </I18nLayout>
  );
}