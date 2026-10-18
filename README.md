# ruleta-web — Frontend de "Ruleta de sorteos"

SPA en React 19 + TypeScript estricto para hacer sorteos con una ruleta justa: modo prueba sin cuenta y,
con cuenta, sorteos guardados, participantes con foto e historial. Interfaz en español e inglés.

## Cómo ejecutar

Requisitos: Node 22 y npm 10.

```bash
npm install
npm run dev        # http://localhost:5173 — proxy /api-ruleta y /media → http://localhost:8080 (ruleta-api)
npm run dev:mock   # igual, pero con un backend simulado en el navegador (MSW); no necesita ruleta-api
```

| Script                  | Qué hace                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | ESLint (capas, accesibilidad, sin textos literales en JSX, sin `fetch` fuera de `lib/http`)                                        |
| `npm run typecheck`     | `tsc -b --noEmit`                                                                                                                  |
| `npm test`              | Vitest + Testing Library (incluye la prueba estadística de HU-17)                                                                  |
| `npm run test:coverage` | Cobertura de `lib`, `components/wheel` y `utils`                                                                                   |
| `npm run i18n:check`    | Falla si falta una clave en `es.json`/`en.json`, si el código usa una clave inexistente o si falta un código de error del catálogo |
| `npm run build`         | Typecheck + build de producción en `dist/`                                                                                         |
| `npm run format`        | Prettier                                                                                                                           |

En `dev:mock` el backend simulado guarda los datos en `sessionStorage` de la pestaña. El enlace de
restablecer contraseña se prueba con `/restablecer/cualquier-token` (y `/restablecer/vencido` para el error).

## Variables de entorno

Validadas con Zod en `src/config/env.ts` (si una es inválida, la app no arranca). Ver `.env.example`.

| Variable                        | Por defecto             | Uso                                                                                       |
| ------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`             | `/api-ruleta/v1`        | Base de la API (mismo origen: proxy de Vite en desarrollo, CloudFront en producción)      |
| `VITE_ENABLE_MSW`               | `false`                 | Backend simulado en el navegador (solo desarrollo; el chunk no se descarga si es `false`) |
| `VITE_ENABLE_WHEEL_3D`          | `false`                 | Reservada para la ruleta WebGL (HU-30). Hoy solo existe el punto de extensión             |
| `VITE_ENABLE_PARTICIPANT_EMAIL` | `false`                 | Bandera de R2: muestra el campo y la columna de correo del participante (HU-23)           |
| `VITE_ERROR_REPORTING_URL`      | vacío                   | URL opcional para enviar `warn`/`error` del navegador con `sendBeacon` (P-F1)             |
| `API_PROXY_TARGET`              | `http://localhost:8080` | Solo para el proxy de Vite                                                                |

## Estructura

```
src/
├─ app/                 rutas, layouts y providers (componen features; sin reglas de negocio)
│  ├─ router.tsx        "/" en el JS inicial; acceso y app con cuenta con lazy()
│  ├─ providers/        QueryClient, i18n, efectos de sesión, Toaster
│  └─ routes/           guest-routes, auth-routes, app-layout (guard), app-routes, route-error
├─ features/            aisladas entre sí (ESLint lo impide)
│  ├─ guest-raffle/     modo prueba (HU-01 a HU-04)
│  ├─ auth/             acceso, registro + migración, recuperar contraseña (HU-05 a HU-09)
│  ├─ raffles/          selector, crear/renombrar/eliminar, opciones (HU-11, HU-12)
│  ├─ participants/     tabla, editor con foto y recorte, activar/desactivar (HU-13 a HU-16)
│  ├─ spins/            giro con servidor, últimos ganadores, historial (HU-17 a HU-21)
│  ├─ admin/            módulo de administración (solo ROLE_ADMIN)
│  └─ account/          idioma, cerrar sesión, eliminar cuenta (HU-08, HU-10, HU-28)
├─ components/          UI compartida: ui/, layout/, wheel/ (ruleta SVG/CSS), winner/ (modal)
├─ lib/                 http (cliente, CSRF, refresh), i18n, random (fairIndex), guest (Zustand), session, toast
├─ hooks/  utils/  config/
├─ i18n/locales/        es.json, en.json
├─ styles/              tokens.css (tokens del diseño) y globals.css
└─ testing/             setup de Vitest, render con providers, MSW (solo dev:mock)
```

## Decisiones

**Contrato con `ruleta-api`.** Se sigue §11.2 de los requerimientos más las decisiones del backend:
sesión en `{ user: {...} }`; `POST /raffles` con `participants: string[]` (el servidor separa nombre y
apellido); foto en el campo multipart `file`; participante con `needsLastName`, `initials` y `version`;
giro con `winner` (participante completo) y `winnerRemoved`. Todas las respuestas se validan con Zod; si
no cumplen, se lanza `ContractError` y se muestra un error genérico.

**Sesión y seguridad.** Cookies `HttpOnly` (`credentials: 'include'`), nunca tokens en el navegador. Las
mutaciones envían `X-XSRF-TOKEN` con el valor crudo de la cookie `XSRF-TOKEN`; si la cookie aún no existe se
hace antes `GET /status`, y ante `403 auth.csrf_invalid` se repite una sola vez. Ante `401 auth.token_expired`
se llama una sola vez a `POST /sessions/refresh` (compartida por todas las peticiones en paralelo) y se
repite la petición. El guard (`GET /sessions/current`) también intenta renovar ante `auth.unauthenticated`,
porque la cookie de acceso (15 min) pudo vencer mientras el refresh (30 días) sigue vigente (HU-07, sesión
persistente). `auth.session_revoked` o un refresh fallido limpian la caché y llevan a `/acceso?next=…`
El guard solo consulta la sesión si existe la cookie indicadora `ruleta_session` (valor `1`, sin secretos), que
la API emite con la sesión y borra al cerrarla: un visitante no hace ninguna llamada de sesión ni genera 401.
(solo rutas internas en `next`). Solo los `GET` se reintentan (1 vez ante red o 502/503/504); el `POST` de
giro nunca.

**Errores.** El texto siempre sale de `errors.<code>` (nunca de `description`). Errores de campo → bajo el
campo; 429 → "Intenta de nuevo en N minutos" con `Retry-After`; 5xx/red/contrato → toast genérico con los 8
primeros caracteres del `traceId` como código de soporte.

**Ruleta.** SVG para el disco (lo único que gira) y CSS para canto, grosor, luces, brillo, centro y flecha.
La rotación la escribe `requestAnimationFrame` directamente en `transform` (sin renders de React por cuadro).
El ángulo final sigue HU-18 (vueltas × 360 + 360 − ángulo medio + desvío de ±35 % del segmento) y está
probado: el ganador siempre queda bajo la flecha, a ≥ 15 % de una línea divisoria. Modo prueba: 7–9 vueltas
en 5 s. Con cuenta: arranca al instante, frena cuando llega la respuesta del servidor y empalma la
velocidad (≈5 s en total). "Reducir movimiento": 0,7 s sin vueltas. Los segmentos dibujados se congelan
durante el giro. Con más de 40 activos se ocultan las fotos; los nombres se truncan con "…" calculando el
tamaño de letra para que nunca se superpongan (también con 200).

**Modo prueba.** Zustand en memoria (no persiste al recargar), ganador con `fairIndex` (muestreo por
rechazo con `crypto.getRandomValues`), Fisher-Yates criptográfico para mezclar, sin llamadas al backend
(salvo el `GET /sessions/current` de la cabecera, que no participa en el giro).

**i18n.** `react-i18next` con un archivo por idioma y espacios de nombres por pantalla. Detección: elección
guardada en `localStorage` (con try/catch) → navegador (`en*` → inglés, si no español). Con sesión, el idioma
del perfil gana al iniciar sesión y cada cambio hace `PATCH /users/me { language }`. `Accept-Language` en
cada petición, `<html lang>` sincronizado, fechas y números con `Intl`.

## Desviaciones respecto a la arquitectura del front

| Documento                                                         | Implementado                                                                                                        | Motivo                                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| React Router v8 en modo framework con pre-render de `/es` y `/en` | React Router v8 en modo datos (SPA con Vite) y rutas en español sin prefijo (`/sorteos/:id`, `/restablecer/:token`) | Lo pidió el encargo (HU-11 usa `/sorteos/{id}`); el idioma vive en `localStorage` y en el perfil, no en la URL. El pre-render queda pendiente |
| "No se usa Zustand" (store propio con `useSyncExternalStore`)     | Zustand para la lista del modo prueba y los toasts                                                                  | Lo pidió el encargo; mismo comportamiento (solo memoria)                                                                                      |
| Tailwind CSS v4                                                   | CSS Modules + variables CSS en `styles/tokens.css`                                                                  | Fidelidad al diseño con tokens y menos dependencias; los tokens son los mismos de §10                                                         |
| Motion para animar                                                | `requestAnimationFrame` propio                                                                                      | Control fino de las fases (acelerar → frenar hacia el ángulo exacto) sin dependencia extra                                                    |
| pnpm, Husky, commitlint, Playwright, Lighthouse CI                | npm; sin hooks ni e2e todavía                                                                                       | Fuera del tiempo de esta entrega (ver Pendientes)                                                                                             |
| Cookie `lang` (365 días)                                          | `localStorage` `ruleta.lang`                                                                                        | HU-27 lo pide así; sin prefijo en la URL no hace falta la cookie                                                                              |

## Administración

Ruta `/admin` (carga aparte con `lazy()`), solo para usuarios con `role: 'ADMIN'` en la sesión. Sin sesión
actúa el guard normal (→ `/acceso`); a un `USER` se le muestra "Esta página no existe" para no revelar la
sección, y la API vuelve a validar (`403 auth.forbidden`). El enlace "Administración" del menú solo aparece
para ADMIN.

**Reglas.** El registro público y el formulario del admin crean siempre cuentas `USER`; la UI nunca ofrece
crear administradores ni cambiar roles (el rol ADMIN se asigna en la base de datos). Las filas ADMIN se
listan con la etiqueta "Cuenta protegida" y sin editar/eliminar; si aun así la API responde
`422 admin.protected_account`, se muestra su traducción.

| Pestaña (`?tab=`) | Contenido                                                                                                                                                                                                                                                                                                                                         | Endpoints                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `dashboard`       | 7 indicadores, gráfica de actividad diaria (7/30/90 días; nuevos usuarios, nuevos sorteos, giros) y últimas 5 jugadas                                                                                                                                                                                                                             | `GET /admin/summary`, `/admin/activity?days=`, `/admin/spins?$limit=5` |
| `users`           | Histórico con métricas, búsqueda por correo (debounce 300 ms), orden por registro, correo, giros o última actividad, paginación de 20. Crear (correo, contraseña con requisitos RN-09 en tiempo real, idioma), editar (correo, idioma, nueva contraseña opcional con aviso de cierre de sesiones) y eliminar (confirmación escribiendo el correo) | `GET/POST /admin/users`, `PATCH/DELETE /admin/users/{id}`              |
| `raffles`         | Sorteos de todos los usuarios; búsqueda por nombre o dueño; filtro por dueño (clic en el correo)                                                                                                                                                                                                                                                  | `GET /admin/raffles?q=&ownerId=`                                       |
| `spins`           | Jugadas y ganadores; búsqueda; filtros por usuario y sorteo como chips quitables; orden por fecha                                                                                                                                                                                                                                                 | `GET /admin/spins?q=&ownerId=&raffleId=&asc=`                          |

"Ver jugadas" (o clic en la fila de un usuario) abre la pestaña Jugadas con el filtro. La pestaña y los
filtros viven en la URL (`?tab=spins&usuario=…&sorteo=…`), así que la vista se puede recargar o compartir.

**Gráfica.** SVG propio, sin librerías: un solo eje Y, tres líneas de 2 px en orden fijo con los tokens
`--color-chart-1..3` (paleta validada contra la superficie `#15171D`: separación para daltonismo ΔE ≥ 9,4 y
contraste ≥ 3:1), leyenda con totales, cruz y tooltip al pasar el cursor, y una tabla equivalente oculta
visualmente para lectores de pantalla (`role="img"` con `<title>`/`<desc>`).

**Estados.** Esqueletos de carga, vacío con mensaje, y error con código de soporte (`traceId`) y "Volver a
intentar". Las tablas tienen scroll horizontal dentro de su contenedor, así que la página no se desborda a
360 px. Claves de TanStack Query bajo `['admin', …]` por pestaña y filtros; crear, editar o eliminar invalida
todo el módulo (indicadores incluidos).

**Probar en local.** `npm run dev:mock` siembra un administrador: `admin@ruleta.dev` / `Admin1234`.

## Calidad verificada (17-oct-2026)

| Prueba | Resultado |
|---|---|
| `npm run lint`, `typecheck`, `i18n:check`, `build` | En verde |
| `npm test` (Vitest + Testing Library) | 104/104 |
| E2E en Chrome real contra `ruleta-api` (modo prueba, registro, participantes con foto, giros, historial, idioma, sesión, agotar ganadores, auditoría de red) | 67/67 |
| E2E del administrador (tablero, CRUD, históricos, USER sin acceso) | 35/35 |
| 200 participantes en Chrome | 23/23 · ~140 fps · ganador siempre bajo la flecha |

## Pendientes

- Pruebas e2e con Playwright y `@axe-core/playwright`; Lighthouse CI; pipeline de CI/CD y despliegue (S3 + CloudFront).
- Pre-render de la página del modo prueba y SEO (`hreflang`, sitemap).
- JS inicial ≈ 186 KB gzip (meta 180 KB): zod clásico es la mayor dependencia; migrar a `zod/mini` lo bajaría.
- Ruleta WebGL (HU-30) y correo al ganador (R2: HU-23 a HU-26, HU-29) — solo están preparados el punto de extensión y la bandera.
- Monitoreo de errores (P-F1): hoy solo `sendBeacon` a una URL configurable.
