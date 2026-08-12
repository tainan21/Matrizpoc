\set ON_ERROR_STOP on
SELECT set_config('matriz.expected_ci_role', :'expected_role', false);
DO $$ BEGIN
  IF session_user <> current_setting('matriz.expected_ci_role') OR current_user <> current_setting('matriz.expected_ci_role') THEN
    RAISE EXCEPTION 'Runtime connection did not authenticate as % (session=%, current=%)', current_setting('matriz.expected_ci_role'), session_user, current_user;
  END IF;
  IF current_setting('matriz.tenant_id', true) IS NOT NULL THEN
    RAISE EXCEPTION 'Fresh runtime connection inherited tenant context';
  END IF;
END $$;
