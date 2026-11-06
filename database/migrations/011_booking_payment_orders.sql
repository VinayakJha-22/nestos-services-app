BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES public.bookings(id) ON DELETE RESTRICT,

    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100),

    amount_paise BIGINT NOT NULL
        CHECK (amount_paise > 0),

    currency VARCHAR(3) NOT NULL DEFAULT 'INR',

    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
        CHECK (
            status IN (
                'pending_payment',
                'paid',
                'failed',
                'refund_pending',
                'refunded'
            )
        ),

    failure_reason TEXT,

    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT booking_payment_paid_requires_payment_id
        CHECK (
            status NOT IN ('paid', 'refund_pending', 'refunded')
            OR razorpay_payment_id IS NOT NULL
        )
);

-- Each Razorpay order must map to exactly one local payment attempt.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_booking_payment_razorpay_order
ON public.booking_payment_orders (razorpay_order_id);

-- A Razorpay payment ID cannot be reused.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_booking_payment_razorpay_payment
ON public.booking_payment_orders (razorpay_payment_id)
WHERE razorpay_payment_id IS NOT NULL;

-- Only one active payment attempt per booking.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_booking_payment_one_pending
ON public.booking_payment_orders (booking_id)
WHERE status = 'pending_payment';

-- Prevent multiple successful payments for the same booking.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_booking_payment_one_paid
ON public.booking_payment_orders (booking_id)
WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS
    idx_booking_payment_booking_history
ON public.booking_payment_orders (booking_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.booking_payment_orders
TO nestos_app, postgres;

COMMIT;