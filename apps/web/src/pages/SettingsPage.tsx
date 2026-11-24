import { useI18n } from '@myanmart/shared';
import { I18nLayout } from '../layouts/I18nLayout';
import { useAuth } from '../contexts/auth-context';
import { AccountPageHeader } from '../components/account-page-header';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { signOut } = useAuth();
  return (
    <I18nLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <AccountPageHeader eyebrow={t('account.title')} title={t('account.settings')} description={t('account.settingsDescription')} />
        <Card><CardHeader><CardTitle>{t('account.language')}</CardTitle></CardHeader><CardContent className="flex gap-3"><Button variant={locale === 'en' ? 'default' : 'outline'} onClick={() => setLocale('en')}>English</Button><Button variant={locale === 'my' ? 'default' : 'outline'} onClick={() => setLocale('my')}>မြန်မာ</Button></CardContent></Card>
        <Card><CardHeader><CardTitle>{t('account.session')}</CardTitle></CardHeader><CardContent><Button variant="destructive" onClick={() => void signOut().then(() => { window.location.hash = '#/'; })}>{t('auth.signOut')}</Button></CardContent></Card>
      </div>
    </I18nLayout>
  );
}