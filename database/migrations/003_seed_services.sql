BEGIN;

-- Add the three services to the central catalogue
INSERT INTO public.services (
    id,
    name,
    description,
    base_price,
    duration_minutes,
    is_featured,
    is_active,
    display_order
)
VALUES
(
    'exterior-cleaning',
    'Exterior Cleaning',
    'Exterior-focused car care at your residential society.',
    349,
    NULL,
    FALSE,
    TRUE,
    1
),
(
    'interior-exterior-cleaning',
    'Exterior + Interior Cleaning',
    'Interior and exterior car care at your residential society.',
    499,
    NULL,
    TRUE,
    TRUE,
    2
),
(
    'premium-cleaning',
    'Premium Cleaning',
    'Our premium car-care service, delivered at your society.',
    799,
    NULL,
    FALSE,
    TRUE,
    3
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();


-- Link all three services to every currently active society
INSERT INTO public.society_services (
    society_id,
    service_id,
    price,
    is_available
)
SELECT
    s.id,
    svc.id,
    svc.base_price,
    TRUE
FROM public.societies s
CROSS JOIN public.services svc
WHERE s.is_accepting_bookings = TRUE
  AND svc.is_active = TRUE
ON CONFLICT (society_id, service_id) DO UPDATE SET
    price = EXCLUDED.price,
    is_available = EXCLUDED.is_available,
    updated_at = NOW();

COMMIT;