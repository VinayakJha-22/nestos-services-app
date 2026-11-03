
BEGIN;

-- 1. Central prepaid package catalogue
CREATE TABLE IF NOT EXISTS public.packages (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    credits INTEGER NOT NULL CHECK (credits > 0),
    validity_months INTEGER NOT NULL CHECK (validity_months > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed the approved packages
INSERT INTO public.packages (
    id, name, price, credits, validity_months, display_order
)
VALUES
    ('starter', 'Starter', 1699, 5, 2, 1),
    ('value', 'Value', 3399, 10, 4, 2),
    ('max-value', 'Max Value', 6799, 20, 12, 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    credits = EXCLUDED.credits,
    validity_months = EXCLUDED.validity_months,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- 3. Services eligible for prepaid credits
-- Exterior Cleaning is intentionally excluded.
CREATE TABLE IF NOT EXISTS public.package_service_credit_costs (
    service_id TEXT PRIMARY KEY
        REFERENCES public.services(id) ON DELETE RESTRICT,
    credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.package_service_credit_costs (
    service_id, credit_cost
)
VALUES
    ('exterior-cleaning', 1)
    ('interior-exterior-cleaning', 2),
    ('premium-cleaning', 3)
ON CONFLICT (service_id) DO UPDATE SET
    credit_cost = EXCLUDED.credit_cost;

-- 4. Society-level package availability
-- Packages are not automatically enabled at every society.
CREATE TABLE IF NOT EXISTS public.society_packages (
    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,
    package_id TEXT NOT NULL
        REFERENCES public.packages(id) ON DELETE RESTRICT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (society_id, package_id)
);

-- 5. Package purchase orders
-- Payment integration will update these records later.
CREATE TABLE IF NOT EXISTS public.package_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL
        REFERENCES public.customers(id) ON DELETE RESTRICT,
    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,
    package_id TEXT NOT NULL
        REFERENCES public.packages(id) ON DELETE RESTRICT,

    package_name_snapshot VARCHAR(100) NOT NULL,
    price_snapshot NUMERIC(10, 2) NOT NULL
        CHECK (price_snapshot >= 0),
    credits_snapshot INTEGER NOT NULL
        CHECK (credits_snapshot > 0),
    validity_months_snapshot INTEGER NOT NULL
        CHECK (validity_months_snapshot > 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',

    status VARCHAR(25) NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN (
            'pending_payment',
            'paid',
            'payment_failed',
            'cancelled',
            'refunded'
        )),

    payment_provider VARCHAR(50),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_orders_customer
    ON public.package_purchase_orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_package_orders_status
    ON public.package_purchase_orders (status, created_at DESC);

-- 6. Customer subscriptions
-- A subscription is created only after its purchase order is paid.
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL
        REFERENCES public.customers(id) ON DELETE RESTRICT,
    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,
    package_id TEXT NOT NULL
        REFERENCES public.packages(id) ON DELETE RESTRICT,
    purchase_order_id UUID NOT NULL UNIQUE
        REFERENCES public.package_purchase_orders(id) ON DELETE RESTRICT,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN (
            'active',
            'exhausted',
            'expired',
            'cancelled',
            'suspended'
        )),

    credits_purchased INTEGER NOT NULL
        CHECK (credits_purchased > 0),
    credits_remaining INTEGER NOT NULL
        CHECK (
            credits_remaining >= 0
            AND credits_remaining <= credits_purchased
        ),

    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
    ON public.customer_subscriptions (customer_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_society
    ON public.customer_subscriptions (society_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry
    ON public.customer_subscriptions (expires_at)
    WHERE status = 'active';

-- 7. Credit ledger: records every credit movement
CREATE TABLE IF NOT EXISTS public.subscription_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL
        REFERENCES public.customer_subscriptions(id) ON DELETE RESTRICT,

    entry_type VARCHAR(30) NOT NULL
        CHECK (entry_type IN (
            'purchase',
            'booking_redemption',
            'booking_refund',
            'manual_adjustment',
            'expiry'
        )),

    credits_delta INTEGER NOT NULL CHECK (credits_delta <> 0),
    reference_type VARCHAR(30),
    reference_id TEXT,
    idempotency_key VARCHAR(200) UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_subscription
    ON public.subscription_credit_ledger (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_reference
    ON public.subscription_credit_ledger (reference_type, reference_id);

COMMIT;
