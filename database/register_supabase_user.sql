-- ==============================================================================
-- VetFlow SaaS Enterprise: Script de Vinculación Supabase Auth <-> PostgreSQL
-- ==============================================================================
-- Utiliza este script en la consola SQL de Supabase (SQL Editor) para vincular
-- cualquier usuario registrado en Supabase Auth (auth.users) con la tabla de
-- negocio (public.users) manteniendo aislamiento estricto RLS.
-- ==============================================================================

-- INSTRUCCIONES:
-- 1. Copia el UID del usuario creado en Supabase Auth (Authentication -> Users).
-- 2. Reemplaza 'TU_SUPABASE_USER_UID_AQUI' con ese valor.
-- 3. Reemplaza el correo, nombre y rol según corresponda.

DO $$
DECLARE
    -- ID generado por Supabase Auth para tu usuario
    v_supabase_uid UUID := 'TU_SUPABASE_USER_UID_AQUI'::uuid; 
    
    -- Correo electrónico registrado en Supabase Auth
    v_email VARCHAR := 'laura.gomez@sanmartin.com'; 
    
    -- Nombre completo para el perfil clínico
    v_name VARCHAR := 'Dra. Laura Gómez'; 
    
    -- Rol dentro del sistema: 'TenantOwner', 'DirectorClinico', 'Veterinario', 'Recepcionista'
    v_role VARCHAR := 'Veterinario'; 
    
    -- Cédula profesional (opcional para veterinarios)
    v_license VARCHAR := 'MV-98765-MX';
    
    -- Tenant ID por defecto (Clínica Veterinaria San Martín)
    v_tenant_id UUID := 'a1111111-1111-4111-a111-111111111111'::uuid;
    
    -- Sucursal principal (Sede Principal San Martín)
    v_branch_id UUID := 'a2222222-2222-4222-a222-222222222222'::uuid;
BEGIN
    -- 1. Establecer el contexto RLS temporal para permitir la inserción/modificación
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

    -- 2. Insertar o actualizar el perfil en public.users vinculando el UID exacto de Supabase Auth
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
        v_supabase_uid,
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

    -- 3. Asignar el usuario a su sucursal principal
    INSERT INTO public.user_branches (
        tenant_id,
        user_id,
        branch_id
    ) VALUES (
        v_tenant_id,
        v_supabase_uid,
        v_branch_id
    )
    ON CONFLICT (user_id, branch_id) DO NOTHING;

    RAISE NOTICE 'Usuario % (%) vinculado exitosamente en public.users con UID Supabase %', v_name, v_email, v_supabase_uid;
END $$;
