import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { PageState } from '@/components/ui/page-state';
import { AccessPanel } from '@/features/auth/components/access-panel';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { useSession } from '@/lib/session/session';
import { toast } from '@/lib/toast/toast-store';
import styles from './routes.module.css';
import { safeNext } from './safe-next';

/** "/acceso" → pantalla 02 (HU-06, HU-07). `?modo=registro` abre "Crear cuenta". */
export function AccessRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: user, isPending } = useSession();
  const mode = params.get('modo') === 'registro' ? 'signup' : 'signin';
  const next = safeNext(params.get('next'));

  if (isPending) return <PageState busy />;
  if (user) return <Navigate to={next} replace />;

  return (
    <AuthShell>
      <AccessPanel
        mode={mode}
        onModeChange={(m) =>
          setParams(
            (prev) => {
              const copy = new URLSearchParams(prev);
              if (m === 'signup') copy.set('modo', 'registro');
              else copy.delete('modo');
              return copy;
            },
            { replace: true },
          )
        }
        onSignedIn={() => void navigate(next, { replace: true })}
        onSignedUp={(result) => {
          if (result.migrationFailed) toast.error(t('auth.signUp.migrationFailed'));
          void navigate(result.raffleId ? `/sorteos/${result.raffleId}` : '/sorteos', {
            replace: true,
          });
        }}
      />
    </AuthShell>
  );
}

/** "/recuperar" (HU-09). */
export function ForgotPasswordRoute() {
  const { t } = useTranslation();
  return (
    <AuthShell>
      <div className={styles.authStack}>
        <div className={styles.authHeading}>
          <h2 className={styles.authTitle}>{t('auth.forgot.heading')}</h2>
          <p className={styles.authSub}>{t('auth.forgot.subheading')}</p>
        </div>
        <ForgotPasswordForm />
        <Link to="/acceso" className={styles.backLink}>
          {t('auth.backToSignIn')}
        </Link>
      </div>
    </AuthShell>
  );
}

/** "/restablecer/:token": enlace del correo (HU-09). */
export function ResetPasswordRoute() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const navigate = useNavigate();
  return (
    <AuthShell>
      <div className={styles.authStack}>
        <div className={styles.authHeading}>
          <h2 className={styles.authTitle}>{t('auth.reset.heading')}</h2>
          <p className={styles.authSub}>{t('auth.reset.subheading')}</p>
        </div>
        <ResetPasswordForm
          token={token}
          onDone={() => {
            toast.success(t('auth.reset.done'));
            void navigate('/sorteos', { replace: true });
          }}
        />
      </div>
    </AuthShell>
  );
}
