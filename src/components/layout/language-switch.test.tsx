import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import { renderWithProviders } from '@/testing/render';
import { LanguageSwitch } from './language-switch';

function Probe() {
  const { t } = useTranslation();
  return <p>{t('wheel.spin')}</p>;
}

describe('LanguageSwitch (HU-27)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: null, errors: [{ code: 'auth.unauthenticated' }] }), {
            status: 401,
          }),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('cambia los textos sin recargar, actualiza <html lang> y recuerda la elección', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LanguageSwitch />
        <Probe />
      </>,
    );
    expect(screen.getByText('Girar la ruleta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ES/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /^EN/ }));

    expect(await screen.findByText('Spin the wheel')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('button', { name: /^EN/ })).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('ruleta.lang')).toBe('en');
  });
});
