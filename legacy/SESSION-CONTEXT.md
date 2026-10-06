# PersonalFinancer — contexto de desarrollo (export de sesión)

App privada de finanzas personales + facturación
freelance en Next.js + Supabase, para un único usuario (autónomo en
España). Rama de verdad: **`main`** (confirmado: PR #16 ya
mergeado ahí). Si clonás de nuevo, partí de `main`, no de ramas de feature
viejas.

Este documento es un resumen técnico de todo lo construido y decidido en una
sesión larga de Claude Code, para no tener que re-descubrir nada al migrar a
un entorno local.

---

## 1. Qué es la app

Dos módulos sobre la misma base de datos:

- **Finanzas personales**: cuentas, movimientos, categorías/subcategorías,
  gastos fijos, importación de extractos bancarios.
- **Facturación freelance**: clientes, facturas con líneas, PDF, ciclo de
  vida draft → issued → paid con numeración correlativa fiscal española.

Siete pantallas: Home (dashboard), Freelance (dashboard), Facturas (listado +
nueva factura), Registro rápido, Importar, Configuración, Login.

## 2. Stack

- **Next.js 16.3.3**, App Router, Turbopack. **Esta versión tiene breaking
  changes reales respecto al conocimiento de entrenamiento de cualquier
  modelo** — `middleware.ts` está deprecado, el reemplazo es `src/proxy.ts`
  exportando `proxy()` + `config.matcher`. El repo tiene un `AGENTS.md` que
  obliga a leer `node_modules/next/dist/docs/` antes de escribir código, y ese
  bloque se regenera solo (`next dev` lo reescribe) — no pelearse con él.
- **Supabase**: Postgres + Auth + Row Level Security + Storage.
- **Tailwind v4** (`@theme inline`, tokens en oklch, `light-dark()`).
- **shadcn, estilo `base-lyra`, sobre Base UI (no Radix)**: los componentes
  usan la prop `render`, no `asChild`. Un `Button` que renderiza un `<a>`
  necesita además `nativeButton={false}`. shadcn es una CLI que **copia**
  código fuente a `src/components/ui/`, no una dependencia — por eso esos
  archivos se pueden (y en un caso se tuvieron que) editar a mano.
- **@phosphor-icons/react** para iconos.
- Sin framework de tests. La verificación real es conducir un navegador
  (Playwright) contra un Supabase simulado — ver sección 7.

## 3. Modelo de datos y seguridad (lo más importante de todo)

Cada tabla tiene `user_id` y una política RLS `user_id = auth.uid()`
(`using` **y** `with check`). La app confía en RLS en vez de filtrar por su
cuenta. Dos salvedades que costaron fallos reales, ambas ya corregidas:

- **Vistas con `security definer` implícito**: una vista corre con los
  privilegios de su dueño salvo que se marque `security_invoker = on`. Una
  vista así se salta la RLS de las tablas que consulta. Pasó con
  `account_balances` (fix en `0003_security_hardening.sql`), y además
  `getAccountBalances` filtra por `user_id` explícitamente como segunda
  barrera.
- **Funciones `security definer` que escriben filas**: `recalc_invoice_totals()`
  tenía `security definer` y hacía `update invoices ... where id = target_id`.
  Con un `invoice_lines.invoice_id` apuntando a una factura ajena, esto
  escribía en datos de otro usuario saltándose RLS. Fix en `0007` (migración
  nueva, PR separado de seguridad): sacarle `security definer` (dejando
  `set search_path = public`) y además exigir en la política de
  `invoice_lines` que la factura padre sea del mismo usuario.

  Se dejaron **a propósito** con `security definer`:
  - `handle_new_user()` (en `0002`): se dispara sobre `auth.users` sin sesión,
    lo necesita para funcionar (siembra cuentas/categorías al registrarse).
  - `handle_invoice_paid()`: solo se alcanza actualizando una factura propia
    (RLS ya lo garantiza), así que `new.user_id` siempre es el usuario
    correcto. Crea el movimiento de cobro al pasar a `paid`, con un índice
    único parcial sobre `movements(invoice_id)` que impide duplicarlo.

Tipos de Supabase en `src/lib/supabase/types.ts` **están escritos a mano, no
generados**. Cada tabla necesita `Row`, `Insert`, `Update` **y
`Relationships`** — sin las entradas de clave foránea, la inferencia de los
`select` con joins colapsa silenciosamente a `never`.

Las migraciones **no se aplican solas**: se corren a mano, en orden, en el SQL
Editor de Supabase. Al tocar el esquema hace falta migración nueva *y*
actualizar a mano `types.ts`.

### Ciclo de vida de una factura

`draft → issued → paid`, columna `status`. El número correlativo se asigna
**al emitir, no al crear** (requisito fiscal español: descartar un borrador no
puede dejar huecos en la serie). Tres triggers:

- `recalc_invoice_totals` recalcula `amount`/`net_amount` desde
  `invoice_lines`.
- `sync_invoice_flags` mantiene los booleanos viejos `issued`/`paid`
  derivados de `status`; **`status` es lo único que escribe la app**.
- `handle_invoice_paid` crea el movimiento de cobro al pasar a `paid`.

## 4. Flujo de datos

Server Components leen con `createClient()` de `@/lib/supabase/server` y
delegan en `src/lib/queries/*` — **esa es la única capa que habla con
Supabase**, los componentes no arman queries. Escrituras por dos caminos:

- **Server Actions** (`actions.ts` por ruta) para `<form action={...}>`.
- **Cliente de navegador** (`@/lib/supabase/client`) en componentes cliente,
  para lo interactivo: registro rápido, importación, subida del logo.

**Trampa real**: `createBrowserClient` lanza si faltan las variables de
entorno, y parte del shell se prerenderiza en build. `@/lib/supabase/client`
cachea una instancia perezosa y **solo se puede llamar dentro de un handler o
un efecto** — llamarlo en el cuerpo de un componente rompe el build en
Vercel, no en local (por eso ese bug pasó desapercibido un tiempo).

## 5. Importación de extractos bancarios (F1)

Todo el parseo ocurre **en el navegador** — el archivo nunca se sube a ningún
sitio, solo las filas que el usuario confirma. Parsers escritos a mano en
`src/lib/import/` en vez de una dependencia de npm, porque el único paquete
que lee ambos formatos de Excel tenía avisos de seguridad abiertos sin
parchear:

- `zip.ts` + `xlsx.ts` — `.xlsx` vía `DecompressionStream` y `DOMParser`.
- `cfb.ts` + `xls.ts` — `.xls` binario (BIFF8), solo los registros de celda
  que aparecen en un extracto real.
- `table.ts` — detección de la fila de cabecera (los bancos anteponen
  filas de título/IBAN/saldo y dejan columnas vacías a la izquierda).
- `values.ts` — importes, fechas, columna de signo (hay extractos que dan
  todo en positivo y el signo aparte).

Verificado contra 4 exports reales de bancos distintos (dos CSV, un .xlsx,
un .xls) **sin guardar nunca los datos reales** — fue un requisito
explícito del usuario.

El asistente de columnas adivina **comprobando el contenido, no solo el
nombre** (`columnScore` ≥ 0.6): por nombre, la columna de comisiones de un banco
le ganaba a la columna de importe real. Cuidado con los patrones de
exclusión: `"comision"` sin acento mataba también `"comisiones"` (que sí es
correcta); la exclusión final quedó como `"comisión de"` / `"comision de"`.

DoS clamps añadidos en el PR de seguridad: `MAX_ROWS = 1_048_576`,
`MAX_COLUMNS = 16_384` (los límites reales de una hoja de Excel) — un
`r="999999999"` fabricado a mano colgaba la pestaña antes de que se viera
nada.

## 6. Estilo / CSS

Tokens en `src/app/globals.css`, en **tres ámbitos sincronizados a mano**:

- `:root` — valores base.
- `.dark` (clase) — preparado para un interruptor manual futuro.
- `@media (prefers-color-scheme: dark) { :root:not(.light) }` — lo que se usa
  hoy (oscuro automático por sistema).

Si algún día se decide que el modo oscuro va a ser *siempre* manual, se puede
borrar el bloque `@media` entero y la complejidad de esta capa baja a la
mitad; hoy existen los tres a la vez porque hay que soportar ambos casos sin
reescribir todo cuando se agregue el interruptor.

`src/lib/ui.ts` tiene el vocabulario de clases compartido (`field`,
`microLabel`, `section`...) para no repetir cadenas largas de Tailwind en
cada formulario.

Paleta de gráficos: `--cat-1…8`, en orden fijo, **validada para daltonismo
contra estas superficies concretas** — cambiar la luminosidad del fondo o de
las tarjetas invalida esa validación.

CSS simplificado de 238 a 137 líneas en un PR dedicado (sin tocar
comportamiento, solo quitar redundancia).

## 7. Verificación (no hay tests automatizados)

Lo que encontró los bugs reales fue **conducir el navegador**, nunca lint ni
build:

- Un `onClick` en un `CommandItem` de **cmdk** nunca se dispara — cmdk
  selecciona con **`onSelect`**. Sin `onClick` no pasa nada y no hay error.
- Colores de gráfico indistinguibles pasaron limpio por build/lint.
- Un regex ASCII-only en el saneo de XSS (ver sección 8) tiraba silenciosamente
  categorías con tilde (`Alimentación`).

Montaje usado: servidor HTTP mínimo que simula la API REST de Supabase en el
puerto **54321** (auth, rest, storage — devuelve JSON fijo), `.env.local`
apuntando ahí, y Playwright con el Chromium preinstalado
(`/opt/pw-browsers/chromium`). Reglas del montaje:

- **Usar `localhost`, nunca `127.0.0.1`** — el dev server devuelve 403 en los
  assets si el origen no coincide con el que arrancó el servidor.
- Comprobar siempre claro y oscuro, y 1280px y 375px.
- El guardia de sesión de `src/proxy.ts` se puede estabilizar/anular
  temporalmente para probar pantallas internas, pero **cuando lo que se
  prueba es el login mismo, tiene que quedar activo** (si no, el test no dice
  nada sobre si el formulario se hidrata bajo CSP).

Otra trampa activa: la regla eslint `react-hooks/set-state-in-effect` — hay
que resolver el estado dentro de una sola cadena de promesas en vez de llamar
`setState` desde el cuerpo del efecto.

## 8. Auditoría de seguridad — qué se encontró y qué se arregló

Se hizo una auditoría completa. Alcance acordado: arreglar todo **menos** el
botón "Crear una cuenta nueva" de la pantalla de login (cosmético, decisión
explícita del usuario). Entregado en **dos PRs separados** (ver política de
ramas en la sección 9 — nunca se encadenan).

**PR A (`claude/seg-aislamiento`, #15)** — arreglos sin riesgo visual:

1. 🔴 **Escritura cruzada entre cuentas** vía `recalc_invoice_totals()` +
   política de `invoice_lines` floja — el hallazgo grave, ver sección 3.
   Migración `0007_invoice_lines_ownership.sql`.
2. 🟠 **XSS en `src/components/ui/chart.tsx`**: `ChartStyle` interpolaba sin
   escapar nombres de categoría/cliente (vienen de la BD) dentro de un
   `<style>` vía `dangerouslySetInnerHTML`. Un nombre tipo
   `x } </style><script>…` cerraba la etiqueta y el navegador lo ejecutaba.
   Fix: sanear el nombre a un identificador CSS válido (Unicode-aware, no
   ASCII-only — perder las tildes también es un bug) y descartar cualquier
   color que no matchee un patrón seguro (`#hex`, `oklch()`, `rgb()`,
   `var(--token)`).
3. 🟡 `shadcn` movido de `dependencies` a `devDependencies` — es herramienta
   de desarrollo y arrastraba `express → qs`, el único hallazgo de
   `npm audit`.
4. 🟡 Clamps de DoS en el parser `.xlsx` (sección 5).

**PR B (`claude/seg-cabeceras`, #16)** — cabeceras y CSP, con riesgo de
romper algo visible, por eso aparte:

- Cabeceras estáticas en `next.config.ts`: `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`,
  `Permissions-Policy` negando cámara/micrófono/geolocalización.
- **CSP con nonce por petición** en `src/proxy.ts`, siguiendo
  `node_modules/next/dist/docs/.../content-security-policy.md` de esta
  versión de Next. Nonce aleatorio por carga, va en la cabecera de
  *petición* (para que Next marque sus propios scripts al renderizar) y en
  la de *respuesta* (para que el navegador solo ejecute los marcados). Las
  dos redirecciones del guardia de sesión también salen con la CSP.
  `frame-ancestors 'none'` reemplaza a `X-Frame-Options` (es la forma
  moderna). `upgrade-insecure-requests` solo fuera de desarrollo (el mock de
  Supabase local es http).

  **Decisión a no revertir sin leer el porqué**: `style-src` lleva
  `'unsafe-inline'` y **sin** nonce. Ponerle nonce hace que el navegador
  ignore `'unsafe-inline'`, y recharts escribe atributos `style` inline — los
  gráficos dejarían de pintarse. El vector que importa es la ejecución de
  *scripts*, y `script-src` sí queda estricto con nonce + `strict-dynamic`.

- El nonce obliga a renderizado dinámico. `/login` se partió en una página de
  servidor (`export const dynamic = "force-dynamic"`) + `login-form.tsx`
  (cliente) porque la config de segmento no se puede exportar desde un
  componente cliente, y una página generada en build no puede llevar el
  nonce de una petición futura. `/` y el 404 **no** necesitaron el mismo
  tratamiento — comprobado en navegador que `/` nunca sirve HTML (siempre
  redirige 307) y el 404 no ejecuta nada.

Verificación de PR B: las siete pantallas, claro/oscuro, 1280/375px, **cero
violaciones de CSP en consola**, con el guardia de sesión activo (para que el
test del login dijera algo real). Logo firmado, PDF y gráficos confirmados
funcionando bajo la CSP.

## 9. Política de ramas y PRs (de `AGENTS.md` — importante, costó un incidente real)

- **Nunca encadenar PRs.** Una PR por tarea, todas con base en `main`. Nunca
  abrir una PR cuya base sea la rama de otra PR.
- Pasó en septiembre de 2026: nueve PRs encadenadas (cada rama partía de la
  anterior). Al mergear la primera, GitHub solo reapunta la siguiente a
  `main` si la rama base se borra al mergear — no se borraron, así que las
  ocho restantes se mergearon en ramas intermedias en vez de en `main`. El
  trabajo no se perdió, pero `main` se quedó con un solo cambio de nueve y
  hubo que rescatarlo con una PR de integración desde la rama acumuladora.
- Si dos tareas tocan los mismos archivos: preferir una sola PR que cubra
  ambas, o entregarlas en serie (abrir la segunda solo cuando la primera esté
  mergeada, rebaseando sobre `main`). Nunca apilar ramas para resolver el
  solapamiento.
- `pre-main` es rama de integración para que el usuario pruebe varias tareas
  juntas en local antes de aprobarlas — es un destino adicional, **no** base
  de PRs.
- Nunca commitear/pushear a `main` directamente. Todo entra por PR, y al
  mergear se borra la rama.

## 10. Comandos

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build — también regenera RouteContext (tipos de rutas)
npm run lint     # eslint, sin argumentos
npx tsc --noEmit # comprobación de tipos aislada
```

`npx tsc --noEmit` falla con `Cannot find name 'RouteContext'` si nunca se
corrió `next build`/`next dev` en el checkout — ese tipo es generado, no
escrito.

## 11. Pendiente / ofrecido pero no empezado

- **Repaso mobile-first**: tablas como tarjetas por debajo de `sm:`, objetivos
  táctiles de 44px, casillas de importación más grandes. Ofrecido, no
  iniciado.
- Hidratación con mismatch preexistente en la pantalla de login — confirmado
  que ya estaba en `main` antes de cualquier cambio de esta sesión,
  deliberadamente fuera de alcance.
- Posible limpieza: quitar el parche de `select option` en `globals.css` si
  `color-scheme: light dark` resulta suficiente por sí solo.

## 12. Estado de PRs al momento de este export

- PR #15 (`claude/seg-aislamiento`) — mergeado.
- PR #16 (`claude/seg-cabeceras`) — mergeado (confirmado en el log de `main`).
- Migración `0007_invoice_lines_ownership.sql` corrida a mano por el usuario
  en el SQL Editor de Supabase tras el merge de #15.

---

*Generado a partir de una sesión de Claude Code sobre este repo. Si abrís
esto en un entorno nuevo: clonar `main`, leer `CLAUDE.md`/`AGENTS.md` del
repo real (no de este checkout si está atrasado) y usar este documento como
contexto adicional, no como reemplazo del código.*
