DO $$
DECLARE app_name text;
BEGIN
  FOREACH app_name IN ARRAY ARRAY['core', 'hub', 'spot', 'seumei', 'contracts', 'willdash'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'matriz_' || app_name || '_migration') THEN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS', 'matriz_' || app_name || '_migration', 'ci-' || app_name || '-migration');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'matriz_' || app_name || '_runtime') THEN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS', 'matriz_' || app_name || '_runtime', 'ci-' || app_name || '-runtime');
    END IF;
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', app_name, 'matriz_' || app_name || '_migration');
    EXECUTE format('ALTER SCHEMA %I OWNER TO %I', app_name, 'matriz_' || app_name || '_migration');
  END LOOP;
END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
