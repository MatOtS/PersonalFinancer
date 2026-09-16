-- Quick entry can now record income as well as expenses, so categories need to
-- say which side they belong to: the seeded set (Vivienda, Alimentación,
-- Transporte...) only makes sense against a payment.
--
-- The column is called `kind` rather than `type` to avoid colliding with
-- `movements.type`, which already means something different (personal vs
-- freelance).

alter table categories
  add column if not exists kind text not null default 'expense';

alter table categories
  drop constraint if exists categories_kind_check;

alter table categories
  add constraint categories_kind_check check (kind in ('expense', 'income'));

-- ---------------------------------------------------------------------
-- Seed income categories for users that already exist.
-- ---------------------------------------------------------------------

insert into categories (user_id, name, kind)
select u.id, seed.name, 'income'
from auth.users u
cross join (
  values ('Facturación'), ('Nómina'), ('Devoluciones'), ('Otros ingresos')
) as seed(name)
where not exists (
  select 1 from categories c where c.user_id = u.id and c.kind = 'income'
);

-- ---------------------------------------------------------------------
-- New users get both sides from the start.
-- ---------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cat record;
  cat_id uuid;
begin
  insert into user_settings (user_id) values (new.id);

  insert into accounts (user_id, name) values
    (new.id, 'BBVA'),
    (new.id, 'Santander'),
    (new.id, 'Efectivo'),
    (new.id, 'Wise'),
    (new.id, 'MyInvestor');

  for cat in
    select * from (values
      ('Vivienda', array['Alquiler/Hipoteca', 'Comunidad', 'Mantenimiento']),
      ('Suministros', array['Luz', 'Agua', 'Gas', 'Internet']),
      ('Alimentación', array['Supermercado', 'Restaurantes']),
      ('Transporte', array['Combustible', 'Transporte público', 'Mantenimiento vehículo']),
      ('Ocio', array['Salidas', 'Viajes', 'Hobbies']),
      ('Suscripciones', array['Streaming', 'Software personal']),
      ('Material/Equipo freelance', array['Hardware', 'Herramientas']),
      ('Software', array['Licencias', 'SaaS']),
      ('Impuestos', array['IRPF', 'IVA', 'Autónomos']),
      ('Salud', array['Seguro médico', 'Farmacia']),
      ('Otros', array['Varios'])
    ) as t(name, subcats)
  loop
    insert into categories (user_id, name, kind) values (new.id, cat.name, 'expense')
      returning id into cat_id;

    insert into subcategories (user_id, category_id, name)
      select new.id, cat_id, unnest(cat.subcats);
  end loop;

  insert into categories (user_id, name, kind) values
    (new.id, 'Facturación', 'income'),
    (new.id, 'Nómina', 'income'),
    (new.id, 'Devoluciones', 'income'),
    (new.id, 'Otros ingresos', 'income');

  return new;
end;
$$;
