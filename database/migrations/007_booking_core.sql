
BEGIN;

-- =========================================================
-- 007: BOOKING CORE
-- Customer bookings and booking status history
-- =========================================================

-- Booking reference sequence
CREATE SEQUENCE IF NOT EXISTS public.booking_reference_seq
    START WITH 1001
    INCREMENT BY 1;

-- =========================================================
-- BOOKINGS
-- One booking represents one vehicle wash service.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_reference TEXT NOT NULL UNIQUE
        DEFAULT (
            'NS-' || LPAD(
                NEXTVAL('public.booking_reference_seq')::TEXT,
                6,
                '0'
            )
        ),

    -- Customer and service references
    customer_id UUID NOT NULL
        REFERENCES public.customers(id) ON DELETE RESTRICT,

    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,

    service_id TEXT NOT NULL
        REFERENCES public.services(id) ON DELETE RESTRICT,

    subscription_id UUID
        REFERENCES public.customer_subscriptions(id) ON DELETE RESTRICT,

    -- Preserve the details displayed when booking was created
    society_name_snapshot TEXT NOT NULL,
    service_name_snapshot TEXT NOT NULL,

    -- Appointment details
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Vehicle details
    vehicle_type TEXT NOT NULL
        CHECK (vehicle_type IN ('hatchback', 'sedan', 'suv')),

    vehicle_details TEXT,

    -- Server-calculated price snapshots (INR)
    base_service_price NUMERIC(10, 2) NOT NULL
        CHECK (base_service_price >= 0),

    vehicle_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 0
        CHECK (vehicle_surcharge >= 0),

    total_amount NUMERIC(10, 2) NOT NULL
        CHECK (total_amount >= 0),

    currency CHAR(3) NOT NULL DEFAULT 'INR'
        CHECK (currency = 'INR'),

    -- Booking lifecycle
    booking_status TEXT NOT NULL DEFAULT 'pending_payment'
        CHECK (
            booking_status IN (
                'pending_payment',
                'confirmed',
                'assigned',
                'in_progress',
                'completed',
                'cancelled',
                'expired'
            )
        ),

    -- Payment summary; detailed payment records come in migration 009
    payment_method TEXT NOT NULL
        CHECK (payment_method IN ('one_time', 'prepaid')),

    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            payment_status IN (
                'pending',
                'paid',
                'failed',
                'refund_pending',
                'refunded',
                'not_required'
            )
        ),

    -- Booking origin
    booking_source TEXT NOT NULL DEFAULT 'customer'
        CHECK (
            booking_source IN (
                'customer',
                'manager',
                'admin',
                'crm'
            )
        ),

    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bookings_valid_time
        CHECK (end_time > start_time),

    CONSTRAINT bookings_prepaid_subscription
        CHECK (
            payment_method <> 'prepaid'
            OR subscription_id IS NOT NULL
        )
);

-- =========================================================
-- BOOKING STATUS HISTORY
-- Records every lifecycle status transition.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES public.bookings(id) ON DELETE RESTRICT,

    previous_status TEXT,
    new_status TEXT NOT NULL
        CHECK (
            new_status IN (
                'pending_payment',
                'confirmed',
                'assigned',
                'in_progress',
                'completed',
                'cancelled',
                'expired'
            )
        ),

    changed_by_type TEXT NOT NULL
        CHECK (
            changed_by_type IN (
                'system',
                'customer',
                'manager',
                'admin',
                'crm'
            )
        ),

    changed_by_reference TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_bookings_customer
    ON public.bookings(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_society_date
    ON public.bookings(society_id, booking_date, start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_status
    ON public.bookings(booking_status);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
    ON public.bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_bookings_subscription
    ON public.bookings(subscription_id)
    WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking
    ON public.booking_status_history(booking_id, created_at DESC);

COMMIT;
