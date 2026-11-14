
BEGIN;

-- =========================================================
-- 016: PERSISTENT PAYMENT REFUND MANAGEMENT
-- Supports booking payments and prepaid package purchases.
-- =========================================================

-- 1. Allow package purchases to enter the refund workflow.
ALTER TABLE public.package_purchase_orders
    DROP CONSTRAINT IF EXISTS package_purchase_orders_status_check;

ALTER TABLE public.package_purchase_orders
    ADD CONSTRAINT package_purchase_orders_status_check
    CHECK (
        status IN (
            'pending_payment',
            'paid',
            'payment_failed',
            'cancelled',
            'refund_pending',
            'refunded'
        )
    );

ALTER TABLE public.package_purchase_orders
    DROP CONSTRAINT IF EXISTS package_purchase_orders_refund_requires_payment_id;

ALTER TABLE public.package_purchase_orders
    ADD CONSTRAINT package_purchase_orders_refund_requires_payment_id
    CHECK (
        status NOT IN ('refund_pending', 'refunded')
        OR razorpay_payment_id IS NOT NULL
    );


-- 2. Persistent refund requests.
CREATE TABLE IF NOT EXISTS public.payment_refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Exactly one payment source must be provided.
    booking_payment_order_id UUID
        REFERENCES public.booking_payment_orders(id)
        ON DELETE RESTRICT,

    package_purchase_order_id UUID
        REFERENCES public.package_purchase_orders(id)
        ON DELETE RESTRICT,

    society_id UUID NOT NULL
        REFERENCES public.societies(id)
        ON DELETE RESTRICT,

    -- Refund amounts are always stored in the smallest currency unit.
    refund_amount_paise BIGINT NOT NULL
        CHECK (refund_amount_paise > 0),

    currency VARCHAR(3) NOT NULL DEFAULT 'INR',

    customer_reason TEXT,

    request_source VARCHAR(20) NOT NULL DEFAULT 'operations'
        CHECK (
            request_source IN (
                'customer',
                'operations',
                'system'
            )
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'approved',
                'rejected',
                'processing',
                'processed',
                'failed'
            )
        ),

    -- Operations review.
    reviewed_by UUID
        REFERENCES public.operations_users(id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMPTZ,
    decision_notes TEXT,

    -- Razorpay refund tracking.
    razorpay_refund_id VARCHAR(100),
    idempotency_key VARCHAR(200) NOT NULL UNIQUE,

    processed_at TIMESTAMPTZ,
    failure_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT payment_refund_exactly_one_payment
        CHECK (
            (
                booking_payment_order_id IS NOT NULL
                AND package_purchase_order_id IS NULL
            )
            OR
            (
                booking_payment_order_id IS NULL
                AND package_purchase_order_id IS NOT NULL
            )
        ),

    CONSTRAINT payment_refund_processed_requires_provider_id
        CHECK (
            status <> 'processed'
            OR razorpay_refund_id IS NOT NULL
        )
);


-- 3. A Razorpay refund ID must never be reused.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_payment_refund_razorpay_refund_id
ON public.payment_refund_requests (razorpay_refund_id)
WHERE razorpay_refund_id IS NOT NULL;


-- 4. Prevent multiple simultaneous active requests
-- for the same booking payment.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_payment_refund_active_booking
ON public.payment_refund_requests (booking_payment_order_id)
WHERE booking_payment_order_id IS NOT NULL
  AND status IN ('pending', 'approved', 'processing');


-- 5. Prevent multiple simultaneous active requests
-- for the same package purchase.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_payment_refund_active_package
ON public.payment_refund_requests (package_purchase_order_id)
WHERE package_purchase_order_id IS NOT NULL
  AND status IN ('pending', 'approved', 'processing');


-- 6. Operations queue and history indexes.
CREATE INDEX IF NOT EXISTS
    idx_payment_refund_status_created
ON public.payment_refund_requests (status, created_at DESC);


CREATE INDEX IF NOT EXISTS
    idx_payment_refund_society_status
ON public.payment_refund_requests (
    society_id,
    status,
    created_at DESC
);


CREATE INDEX IF NOT EXISTS
    idx_payment_refund_booking_history
ON public.payment_refund_requests (
    booking_payment_order_id,
    created_at DESC
)
WHERE booking_payment_order_id IS NOT NULL;


CREATE INDEX IF NOT EXISTS
    idx_payment_refund_package_history
ON public.payment_refund_requests (
    package_purchase_order_id,
    created_at DESC
)
WHERE package_purchase_order_id IS NOT NULL;


-- 7. Application permissions.
GRANT SELECT, INSERT, UPDATE
ON public.payment_refund_requests
TO nestos_app, postgres;


COMMIT;
