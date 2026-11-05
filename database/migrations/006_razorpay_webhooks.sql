
BEGIN;

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),

    processing_status VARCHAR(20) NOT NULL DEFAULT 'received'
        CHECK (processing_status IN (
            'received',
            'processed',
            'failed'
        )),

    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhooks_status
    ON public.razorpay_webhook_events (
        processing_status,
        received_at
    );

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.razorpay_webhook_events
TO postgres, nestos_app;

COMMIT;
