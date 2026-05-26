CREATE OR REPLACE FUNCTION create_advertiser_profile(user_id UUID, company_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (user_id, company_name, 'advertiser')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = 'advertiser';
END;
$$;
