BEGIN;

ALTER TABLE public.package_purchase_orders
    ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS razorpay_signature_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_package_orders_razorpay_order_id
ON public.package_purchase_orders (razorpay_order_id)
WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_package_orders_razorpay_payment_id
ON public.package_purchase_orders (razorpay_payment_id)
WHERE razorpay_payment_id IS NOT NULL;

-- Grant schema access
GRANT USAGE ON SCHEMA public TO postgres, nestos_app;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.package_purchase_orders
TO postgres, nestos_app;

COMMIT;