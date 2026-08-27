# Finanzas — Dashboard personal + freelance (MVP web)

App web privada para centralizar finanzas personales y facturación freelance:
Home, Freelance, Emisión de facturas, Importación de CSV bancario y Ajustes.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security)
- Recharts

## Puesta en marcha

1. **Crear proyecto en [supabase.com](https://supabase.com)** (elegí región UE si te interesa
   privacidad/GDPR).
2. En el **SQL Editor** del proyecto, ejecutá en orden los archivos de `supabase/migrations/`
   (`0001_init.sql`, luego `0002_seed_new_user.sql`).
3. Copiá `.env.example` a `.env.local` y completá con las credenciales de tu proyecto
   (Project Settings → API): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Instalá dependencias y corré la app:

   ```bash
   npm install
   npm run dev
   ```

5. Abrí `http://localhost:3000`, creá tu cuenta desde la pantalla de login ("Crear una cuenta
   nueva"). Al registrarte se precargan automáticamente tus cuentas (BBVA, Santander, Efectivo,
   Wise, MyInvestor) y categorías por defecto.

## Multi-dispositivo (MVP)

Corré la app (`npm run dev` o `npm run build && npm run start`) en cada máquina (escritorio y
portátil), apuntando ambas al mismo proyecto Supabase — los datos se sincronizan solos porque
viven en la nube, no localmente. El acceso desde el móvil fuera de tu red local (deploy propio,
túnel privado, etc.) queda para una fase 2.

## Estructura

- `src/app/(dashboard)/home` — Página 1: finanzas personales
- `src/app/(dashboard)/freelance` — Página 2: freelance + tabla de facturación
- `src/app/(dashboard)/invoices/new` — Página 3: emisión de facturas
- `src/app/(dashboard)/import` — importación de CSV bancario con mapeo configurable
- `src/app/(dashboard)/quick-add` — registro rápido de gastos (mobile-first)
- `src/app/(dashboard)/settings` — cuentas, categorías, IRPF/IVA, numeración de facturas
- `supabase/migrations` — esquema SQL, RLS y seed de datos por usuario
