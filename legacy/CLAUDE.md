# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Comandos

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build — también regenera los tipos de rutas (RouteContext)
npm run lint     # eslint, sin argumentos
npx tsc --noEmit # comprobación de tipos aislada
```

No hay framework de tests ni script `test`: la verificación se hace ejecutando la
app (ver **Verificación** abajo). `npx tsc --noEmit` falla con
`Cannot find name 'RouteContext'` si nunca se corrió `next build`/`next dev` en el
checkout: ese tipo es generado, no escrito.

Las migraciones **no se aplican solas**. Se ejecutan a mano, en orden, en el SQL
Editor del proyecto Supabase (`supabase/migrations/0001…0006`). Al tocar el
esquema hay que añadir una migración nueva *y* actualizar a mano
`src/lib/supabase/types.ts`.

## Arquitectura

### Flujo de datos

Las páginas son Server Components que leen con `createClient()` de
`@/lib/supabase/server` y delegan en `src/lib/queries/*`. Las escrituras van por
dos caminos según el caso:

- **Server Actions** en el `actions.ts` de cada ruta, para formularios que envían
  con `<form action={...}>`.
- **Cliente de navegador** (`@/lib/supabase/client`) en componentes cliente, para
  lo interactivo: registro rápido, importación, subida del logo.

`src/lib/queries/` es la única capa que habla con Supabase; los componentes no
construyen consultas.

### Seguridad: RLS, no comprobaciones en la app

Cada tabla lleva `user_id` y una política `user_id = auth.uid()`. La app confía
en eso en lugar de filtrar por su cuenta, **con dos salvedades que ya costaron un
fallo real**:

- Las vistas ejecutan con los privilegios de su dueño salvo que se marquen
  `security_invoker = on` (ver `0003_security_hardening.sql`). Una vista sin eso
  se salta la RLS de las tablas que consulta.
- `getAccountBalances` filtra además por `user_id` explícitamente, como segunda
  barrera sobre la vista.

El guardia de sesión vive en **`src/proxy.ts`**, no en `middleware.ts`: esta
versión de Next deprecó ese nombre. Exporta `proxy()` y un `config.matcher`.

### El cliente de navegador no se puede crear durante el render

`createBrowserClient` lanza si faltan las variables de entorno, y parte del shell
se prerenderiza en build. Por eso `@/lib/supabase/client` cachea una instancia
perezosa y **solo debe llamarse dentro de un handler o un efecto**. Llamarlo en
el cuerpo de un componente rompe el build en Vercel, no en local.

### Tipos de Supabase escritos a mano

`src/lib/supabase/types.ts` no está generado. Cada tabla necesita `Row`,
`Insert`, `Update` **y `Relationships`**: sin las entradas de clave foránea, la
inferencia de los `select` con joins colapsa a `never` y el error aparece lejos
del sitio real.

### Ciclo de vida de una factura

`draft → issued → paid`, en la columna `status`. El número correlativo se asigna
**al emitir**, no al crear, para que descartar un borrador no deje huecos en la
serie (requisito fiscal español). Tres triggers sostienen esto:

- `recalc_invoice_totals` recalcula `amount`/`net_amount` desde `invoice_lines`.
- `sync_invoice_flags` mantiene los booleanos antiguos `issued`/`paid` derivados
  de `status`; **`status` es lo único que escribe la app**.
- `handle_invoice_paid` crea el movimiento de cobro al pasar a `paid`, con un
  índice único parcial sobre `movements(invoice_id)` que impide duplicarlo.

`handle_new_user` (en `0002`) siembra cuentas y categorías al registrarse.

### Importación de extractos

Todo el parseo ocurre **en el navegador**: el archivo del banco no se sube a
ningún sitio, solo viajan las filas confirmadas. `src/lib/import/` contiene
lectores propios en lugar de una dependencia — el único paquete de npm que lee
ambos formatos de Excel está publicado en una versión con avisos de seguridad
abiertos:

- `zip.ts` + `xlsx.ts` — .xlsx vía `DecompressionStream` y `DOMParser`.
- `cfb.ts` + `xls.ts` — .xls binario (BIFF8), solo los registros de celda que usa
  un extracto real.
- `table.ts` — detección de la fila de cabecera. Los bancos anteponen filas de
  título, IBAN y saldo, y dejan columnas vacías a la izquierda.
- `values.ts` — importes, fechas y columna de signo (hay extractos que dan todo
  en positivo y el sentido aparte).

El asistente adivina las columnas **comprobando el contenido**, no solo el
nombre: por nombre, la columna de comisiones de Wise ganaba a la del importe.

### Estilo

- Tokens en `src/app/globals.css`, en **tres ámbitos** que hay que mantener
  sincronizados: `:root`, `.dark` (clase, para un futuro interruptor) y
  `@media (prefers-color-scheme: dark) { :root:not(.light) }` (lo que se usa hoy).
- `src/lib/ui.ts` tiene el vocabulario de clases compartido (`field`,
  `microLabel`, `section`…). Los formularios lo importan; no volver a pegar
  cadenas de clases.
- shadcn con estilo `base-lyra` sobre **Base UI**, no Radix: los componentes
  usan la prop `render`, no `asChild`. Un `Button` que renderiza un `<a>`
  necesita además `nativeButton={false}`.
- Iconos: `@phosphor-icons/react`.
- Paleta de los gráficos: `--cat-1…8`, en orden fijo y sin ciclar, **validada
  para daltonismo contra estas superficies**. Cambiar la luminosidad del fondo o
  de las tarjetas invalida esa validación.

## Verificación

Sin tests automatizados, lo que ha encontrado los fallos reales es **conducir el
navegador**. Dos bugs (un `onClick` que cmdk nunca dispara y colores de gráfico
indistinguibles) pasaron limpiamente por lint y build.

El montaje que se ha venido usando: un servidor HTTP que simula la API de
Supabase en el puerto 54321, `.env.local` apuntando ahí, el guardia de
`src/proxy.ts` anulado temporalmente, y Playwright con
`/opt/pw-browsers/chromium`. Comprobar siempre claro y oscuro, y 1280 y 375 px.

## Trampas conocidas

- `CommandItem` de cmdk selecciona con **`onSelect`**, no con `onClick`. Con
  `onClick` no pasa nada y no hay error.
- La regla `react-hooks/set-state-in-effect` está activa: resolver el estado
  dentro de una única cadena de promesas en vez de llamar a `setState` desde el
  cuerpo del efecto.
- El servidor de desarrollo devuelve **403** a los assets si se entra por
  `127.0.0.1` en vez de `localhost`: el origen no coincide con aquel con el que
  arrancó.
