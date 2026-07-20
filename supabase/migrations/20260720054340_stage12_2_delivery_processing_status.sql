alter type public.signature_delivery_status
add value if not exists 'PROCESSING' after 'PENDING';
