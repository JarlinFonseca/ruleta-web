import * as Tabs from '@radix-ui/react-tabs';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { SignUpResult } from '../api/auth-api';
import styles from './auth.module.css';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

export type AccessMode = 'signin' | 'signup';

type AccessPanelProps = {
  mode: AccessMode;
  onModeChange: (mode: AccessMode) => void;
  onSignedIn: () => void;
  onSignedUp: (result: SignUpResult) => void;
};

/** Pantalla 02: pestañas "Iniciar sesión" / "Crear cuenta". */
export function AccessPanel({ mode, onModeChange, onSignedIn, onSignedUp }: AccessPanelProps) {
  const { t } = useTranslation();
  const isSignIn = mode === 'signin';

  return (
    <Tabs.Root
      value={mode}
      onValueChange={(v) => onModeChange(v === 'signup' ? 'signup' : 'signin')}
      className={styles.access}
    >
      <Tabs.List aria-label={t('auth.tabs.label')} className={styles.tabs}>
        <Tabs.Trigger value="signin" className={styles.tab}>
          {t('auth.tabs.signIn')}
        </Tabs.Trigger>
        <Tabs.Trigger value="signup" className={styles.tab}>
          {t('auth.tabs.signUp')}
        </Tabs.Trigger>
      </Tabs.List>

      <div className={styles.headingBlock}>
        <h2 className={styles.heading}>
          {isSignIn ? t('auth.signIn.heading') : t('auth.signUp.heading')}
        </h2>
        <p className={styles.subheading}>
          {isSignIn ? t('auth.signIn.subheading') : t('auth.signUp.subheading')}
        </p>
      </div>

      <Tabs.Content value="signin" className={styles.tabContent}>
        <SignInForm onSignedIn={onSignedIn} />
      </Tabs.Content>
      <Tabs.Content value="signup" className={styles.tabContent}>
        <SignUpForm onSignedUp={onSignedUp} onGoToSignIn={() => onModeChange('signin')} />
      </Tabs.Content>

      <div className={styles.separator} aria-hidden="true">
        <span />
        {t('auth.or')}
        <span />
      </div>
      <Link to="/" className={styles.secondaryLink}>
        {t('auth.continueAsGuest')}
      </Link>
    </Tabs.Root>
  );
}
