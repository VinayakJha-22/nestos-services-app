BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Societies / service locations
CREATE TABLE IF NOT EXISTS public.societies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    address_line TEXT NOT NULL,
    locality VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(12),
    is_accepting_bookings BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_societies_city
    ON public.societies (city);

-- 2. Customer profiles
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(254),
    verified_phone VARCHAR(16) NOT NULL UNIQUE,
    phone_verified_at TIMESTAMPTZ NOT NULL,
    preferred_society_id UUID
        REFERENCES public.societies(id) ON DELETE SET NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_preferred_society
    ON public.customers (preferred_society_id);

CREATE INDEX IF NOT EXISTS idx_customers_email
    ON public.customers (LOWER(email))
    WHERE email IS NOT NULL;

-- 3. OTP verification challenges
CREATE TABLE IF NOT EXISTS public.phone_verification_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID
        REFERENCES public.customers(id) ON DELETE CASCADE,
    phone_number VARCHAR(16) NOT NULL,
    purpose VARCHAR(30) NOT NULL
        CHECK (purpose IN (
            'sign_in',
            'change_phone',
            'account_recovery'
        )),
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5
        CHECK (max_attempts > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_challenges_lookup
    ON public.phone_verification_challenges
       (phone_number, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_challenges_customer
    ON public.phone_verification_challenges (customer_id);

-- 4. Persistent customer sessions
CREATE TABLE IF NOT EXISTS public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL
        REFERENCES public.customers(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer
    ON public.customer_sessions (customer_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry
    ON public.customer_sessions (expires_at)
    WHERE revoked_at IS NULL;

-- 5. Notification preferences
CREATE TABLE IF NOT EXISTS public.customer_notification_preferences (
    customer_id UUID PRIMARY KEY
        REFERENCES public.customers(id) ON DELETE CASCADE,
    essential_booking_updates_enabled BOOLEAN
        NOT NULL DEFAULT TRUE
        CHECK (essential_booking_updates_enabled = TRUE),
    promotional_messages_enabled BOOLEAN
        NOT NULL DEFAULT FALSE,
    promotional_consent_updated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;