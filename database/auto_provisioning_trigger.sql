-- ==============================================================================
-- VetFlow SaaS Enterprise: Trigger de Auto-Aprovisionamiento Supabase Auth
-- ==============================================================================
-- Este script crea una función y un trigger en PostgreSQL que escucha la creación
-- de cualquier usuario en `auth.users` de Supabase y crea automáticamente
-- su registro correspondiente en `public.users`.
-- ==============================================================================

-- 1. Función para copiar automáticamente el nuevo registro de auth.users a public.users
CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS TRIGGER AS $$
DECLARE
    v_default_tenant_id UUID := 'a1111111-1111-4111-a111-111111111111'::uuid; -- Clínica San Martín
    v_default_branch_id UUID := 'a2222222-2222-4222-a222-222222222222'::uuid; -- Sede Principal
    v_tenant_id UUID;
    v_role VARCHAR;
    v_name VARCHAR;
BEGIN
    -- Extraer tenant_id y role desde raw_user_meta_data si fueron proporcionados en el registro
    v_tenant_id := COALESCE((new.raw_user_meta_data->>'tenant_id')::uuid, v_default_tenant_id);
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'Veterinario');
    v_name := COALESCE(new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1));

    -- Establecer contexto RLS
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

    -- Insertar en public.users
    INSERT INTO public.users (
        id,
        tenant_id,
        email,
        name,
        role,
        professional_license,
        is_active
    ) VALUES (
        new.id,
        v_tenant_id,
        new.email,
        v_name,
        v_role,
        new.raw_user_meta_data->>'professional_license',
        TRUE
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET 
        id = EXCLUDED.id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW();

    -- Asignar sucursal
    INSERT INTO public.user_branches (
        tenant_id,
        user_id,
        branch_id
    ) VALUES (
        v_tenant_id,
        new.id,
        v_default_branch_id
    )
    ON CONFLICT (user_id, branch_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear Trigger en la tabla de auth de Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_supabase_user();
