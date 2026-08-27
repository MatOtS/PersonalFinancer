-- Seeds sensible defaults (accounts, categories, settings) the moment a new
-- user signs up, so the app is usable immediately after first login.

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
    insert into categories (user_id, name) values (new.id, cat.name)
      returning id into cat_id;

    insert into subcategories (user_id, category_id, name)
      select new.id, cat_id, unnest(cat.subcats);
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
