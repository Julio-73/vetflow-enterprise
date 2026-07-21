-- ==============================================================================
-- VetFlow SaaS Enterprise: Vinculación Dinámica e Idempotente para Julio Quispe
-- ==============================================================================
-- Usuario: julioquispe.dev@gmail.com
-- Coincidencia estricta con el esquema DDL de schema.sql:
--   - public.tenants (id, name, status, plan_tier, created_at, updated_at)
--   - public.branches (id, tenant_id, name, address, country, currency, tax_identifier, is_active)
--   - public.users (id, tenant_id, email, name, role, professional_license, is_active, created_at, updated_at)
--   - public.user_branches (tenant_id, user_id, branch_id, created_at)
--   - auth.users (raw_user_meta_data)
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_branch_id UUID;
    v_email VARCHAR := 'julioquispe.dev@gmail.com';
    v_name VARCHAR := 'Julio Quispe';
    v_role VARCHAR := 'TenantOwner'; -- Rol válido según CHECK constraint en schema.sql
    v_license VARCHAR := 'MV-10001-PE';
BEGIN
    -- 1. Consultar el UID real directamente desde la tabla auth.users de Supabase
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(v_email)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'ERROR: No se encontró el usuario "%" en auth.users de Supabase. Registre primero al usuario en Authentication -> Users.', v_email;
    END IF;

    -- 2. Consultar el Tenant ID de la Clínica San Martín existente en public.tenants
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'ERROR: No se encontró ningún tenant activo en public.tenants.';
    END IF;

    -- 3. Consultar la Sucursal Principal existente para ese tenant en public.branches
    SELECT id INTO v_branch_id
    FROM public.branches
    WHERE tenant_id = v_tenant_id AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'ERROR: No se encontró ninguna sucursal activa para el tenant %.', v_tenant_id;
    END IF;

    -- 4. Establecer el contexto de sesión RLS temporal
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

    -- 5. Limpieza Idempotente: Si existía una versión anterior del mismo correo bajo un UUID distinto, removerla limpiamente
    DELETE FROM public.user_branches 
    WHERE tenant_id = v_tenant_id 
      AND user_id IN (SELECT id FROM public.users WHERE tenant_id = v_tenant_id AND LOWER(email) = LOWER(v_email) AND id != v_user_id);

    DELETE FROM public.users 
    WHERE tenant_id = v_tenant_id 
      AND LOWER(email) = LOWER(v_email) 
      AND id != v_user_id;

    -- 6. Insertar o actualizar el perfil en public.users vinculando exactamente v_user_id
    INSERT INTO public.users (
        id,
        tenant_id,
        email,
        name,
        role,
        professional_license,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_tenant_id,
        v_email,
        v_name,
        v_role,
        v_license,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (tenant_id, email) DO UPDATE
    SET 
        id = EXCLUDED.id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        professional_license = EXCLUDED.professional_license,
        is_active = TRUE,
        updated_at = NOW();

    -- 7. Asignar la relación de sucursal en public.user_branches
    INSERT INTO public.user_branches (
        tenant_id,
        user_id,
        branch_id,
        created_at
    ) VALUES (
        v_tenant_id,
        v_user_id,
        v_branch_id,
        NOW()
    )
    ON CONFLICT (user_id, branch_id) DO NOTHING;

    -- 8. Inyectar metadatos de tenant_id, role y name en auth.users.raw_user_meta_data de Supabase
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'tenant_id', v_tenant_id,
            'role', v_role,
            'name', v_name
        )
    WHERE id = v_user_id;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '¡VINCULACIÓN IDEMPOTENTE FINALIZADA CON ÉXITO!';
    RAISE NOTICE 'Usuario Email: %', v_email;
    RAISE NOTICE 'Supabase Auth UID: %', v_user_id;
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE 'Branch ID: %', v_branch_id;
    RAISE NOTICE '=======================================================';
END $$;
