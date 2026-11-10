
BEGIN;

-- =========================================================
-- 013: OPERATIONS USERS, OTP AUTHENTICATION AND SESSIONS
-- =========================================================

-- 1. Operations user accounts
CREATE TABLE IF NOT EXISTS public.operations_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stable reference used by society ownership history.
    user_reference TEXT NOT NULL UNIQUE
        DEFAULT gen_random_uuid()::TEXT,

    full_name VARCHAR(150) NOT NULL,

    phone_number VARCHAR(16) UNIQUE,

    email VARCHAR(254),

    role TEXT NOT NULL
        CHECK (role IN ('central_admin', 'location_manager')),

    account_status TEXT NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'disabled')),

    phone_verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT operations_users_valid_phone
        CHECK (
            phone_number IS NULL
            OR phone_number ~ '^91[6-9][0-9]{9}$'
        )
);

CREATE INDEX IF NOT EXISTS idx_operations_users_role
    ON public.operations_users(role, account_status);


-- 2. Operations OTP challenges
-- Kept separate from customer phone verification.
CREATE TABLE IF NOT EXISTS public.operations_otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    operations_user_id UUID NOT NULL
        REFERENCES public.operations_users(id) ON DELETE CASCADE,

    phone_number VARCHAR(16) NOT NULL,

    otp_hash TEXT NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts >= 0),

    max_attempts INTEGER NOT NULL DEFAULT 5
        CHECK (max_attempts > 0),

    expires_at TIMESTAMPTZ NOT NULL,

    consumed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT operations_otp_valid_phone
        CHECK (phone_number ~ '^91[6-9][0-9]{9}$'),

    CONSTRAINT operations_otp_valid_expiry
        CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_operations_otp_lookup
    ON public.operations_otp_challenges(
        operations_user_id,
        created_at DESC
    );

CREATE INDEX IF NOT EXISTS idx_operations_otp_phone
    ON public.operations_otp_challenges(
        phone_number,
        created_at DESC
    );


-- 3. Persistent operations sessions
CREATE TABLE IF NOT EXISTS public.operations_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    operations_user_id UUID NOT NULL
        REFERENCES public.operations_users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL,

    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    revoked_at TIMESTAMPTZ,

    CONSTRAINT operations_sessions_valid_expiry
        CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_operations_sessions_user
    ON public.operations_sessions(
        operations_user_id,
        expires_at
    );

CREATE INDEX IF NOT EXISTS idx_operations_sessions_expiry
    ON public.operations_sessions(expires_at)
    WHERE revoked_at IS NULL;


-- 4. Operations audit log
CREATE TABLE IF NOT EXISTS public.operations_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_user_id UUID
        REFERENCES public.operations_users(id) ON DELETE SET NULL,

    society_id UUID
        REFERENCES public.societies(id) ON DELETE SET NULL,

    action TEXT NOT NULL,

    entity_type TEXT,
    entity_id TEXT,

    details JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operations_audit_actor
    ON public.operations_audit_log(
        actor_user_id,
        created_at DESC
    );

CREATE INDEX IF NOT EXISTS idx_operations_audit_society
    ON public.operations_audit_log(
        society_id,
        created_at DESC
    );

CREATE INDEX IF NOT EXISTS idx_operations_audit_entity
    ON public.operations_audit_log(
        entity_type,
        entity_id,
        created_at DESC
    );


-- 5. Create the initial Central NestOS Admin identity.
-- Its phone number will be configured separately.
INSERT INTO public.operations_users (
    user_reference,
    full_name,
    role,
    account_status
)
VALUES (
    'central-nestos-admin',
    'Central NestOS Admin',
    'central_admin',
    'active'
)
ON CONFLICT (user_reference) DO NOTHING;


-- 6. Application permissions
GRANT SELECT, INSERT, UPDATE, DELETE
ON public.operations_users,
   public.operations_otp_challenges,
   public.operations_sessions
TO nestos_app;

GRANT SELECT, INSERT
ON public.operations_audit_log
TO nestos_app;

COMMIT;
