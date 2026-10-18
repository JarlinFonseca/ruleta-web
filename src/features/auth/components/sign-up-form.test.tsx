import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/testing/render';
import { SignUpForm } from './sign-up-form';

describe('SignUpForm (HU-06)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra los requisitos en tiempo real y no envía si las contraseñas no coinciden', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: null, errors: [{ code: 'auth.unauthenticated' }] }), {
          status: 401,
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm onSignedUp={vi.fn()} onGoToSignIn={vi.fn()} />);

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'abc');
    expect(screen.getByText('Mínimo 8 caracteres')).toHaveTextContent('(pendiente)');
    expect(screen.getByText('Al menos 1 letra')).toHaveTextContent('(cumplido)');

    await user.type(screen.getByLabelText('Contraseña'), 'defg1');
    expect(screen.getByText('Al menos 1 número')).toHaveTextContent('(cumplido)');

    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otra1234');
    const callsBefore = fetchMock.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('correo duplicado → mensaje del Gherkin con acceso a iniciar sesión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).endsWith('/users')
          ? new Response(
              JSON.stringify({
                data: null,
                errors: [{ code: 'user.email.duplicate', traceId: 'abcdef1234' }],
              }),
              { status: 409 },
            )
          : new Response(JSON.stringify({ data: { status: 'UP' } }), { status: 200 }),
      ),
    );
    document.cookie = 'XSRF-TOKEN=t; path=/';
    const onGoToSignIn = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm onSignedUp={vi.fn()} onGoToSignIn={onGoToSignIn} />);
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave1234');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'clave1234');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText(/No pudimos crear la cuenta con ese correo/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Inicia sesión' }));
    expect(onGoToSignIn).toHaveBeenCalled();
  });
});
