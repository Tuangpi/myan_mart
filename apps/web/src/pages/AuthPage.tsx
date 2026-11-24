import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@myanmart/shared';
import { ApiRequestError } from '../lib/api-client';
import { useAuth } from '../contexts/auth-context';
import { I18nLayout } from '../layouts/I18nLayout';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

function AuthContent({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === 'sign-up';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (isSignUp && password !== confirmPassword) {
      setError('forms.passwordMismatch');
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        await signUp({ name, phone, email, password });
      } else {
        await signIn({ email, password });
      }
      const target = (location.state as { from?: string } | null)?.from;
      navigate(target && target.startsWith('/') ? target : '/');
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setError(requestError.status === 401 ? 'auth.invalidCredentials' : requestError.status === 409 ? 'auth.emailExists' : 'auth.failed');
      } else {
        setError('auth.failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-4 sm:py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t(isSignUp ? 'auth.createAccount' : 'auth.title')}</CardTitle>
          <CardDescription>{t(isSignUp ? 'auth.signUpDescription' : 'auth.signInDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            {error && <Alert variant="destructive">{t(error)}</Alert>}
            {isSignUp && (
              <label className="grid gap-1.5">
                <span>{t('auth.name')}</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} autoComplete="name" />
              </label>
            )}
            <label className="grid gap-1.5">
              <span>{t('auth.email')}</span>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} autoComplete="email" />
            </label>
            {isSignUp && (
              <label className="grid gap-1.5">
                <span>{t('auth.phone')}</span>
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={6} maxLength={20} autoComplete="tel" />
              </label>
            )}
            <label className="grid gap-1.5">
              <span>{t('auth.password')}</span>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isSignUp ? 8 : 1} maxLength={128} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
            </label>
            {isSignUp && (
              <label className="grid gap-1.5">
                <span>{t('auth.confirmPassword')}</span>
                <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" />
              </label>
            )}
            <Button type="submit" disabled={busy}>{t(busy ? 'auth.loading' : isSignUp ? 'auth.signUp' : 'auth.signIn')}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.newCustomer')}{' '}
            <a className="font-semibold text-primary hover:underline" href={isSignUp ? '#/sign-in' : '#/sign-up'}>
              {t(isSignUp ? 'auth.signIn' : 'auth.signUp')}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return <I18nLayout><AuthContent mode={mode} /></I18nLayout>;
}