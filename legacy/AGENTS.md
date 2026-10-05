<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cómo entregar el trabajo en este repo

## Nunca encadenar PRs

Una PR por tarea, **todas con base en `main`**. Nunca abrir una PR cuya base sea
la rama de otra PR.

Se probó en septiembre de 2026 con nueve PRs encadenadas (cada rama partía de la
anterior) y salió mal: al mergear la primera, GitHub solo reapunta la siguiente a
`main` si la rama base se borra al mergear. Las ramas quedaron vivas, así que las
ocho PRs restantes se mergearon **en sus ramas base intermedias** en lugar de en
`main`. El trabajo no se perdió, pero `main` se quedó con un solo cambio de los
nueve y hubo que rescatarlo con una PR de integración desde la rama acumuladora.

Si dos tareas tocan los mismos archivos y da miedo el conflicto:

- Preferir **una sola PR** que cubra ambas.
- O entregarlas **en serie**: abrir la segunda solo cuando la primera esté
  mergeada, rebasando sobre `main`.
- Nunca resolver el solapamiento apilando ramas.

## Rama de integración

`pre-main` existe para que el usuario pruebe en local varias tareas juntas antes
de aprobarlas. Es un destino adicional, **no** una base de PRs: cada tarea se
mergea ahí además de abrir su propia PR contra `main`.

## Reglas de rama

- No commitear ni pushear a `main` directamente. Todo entra por PR.
- Al mergear, borrar la rama.
