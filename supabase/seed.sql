-- Demo data: a realistic, fully-published Nigerian small business.
-- Left deliberately UNCLAIMED (no business_members row) so it can double as
-- the target for the "find my existing business" search/claim flow during
-- manual testing, in addition to demonstrating the public site, AI View,
-- and agent API immediately after a fresh db-reset.
--
-- Run as the postgres owner role (bypasses RLS, as db-reset.sh does).

insert into businesses (
  id, slug, name, category, description, status,
  verification_status, verification_method, verified_at,
  phone, whatsapp, email, website,
  address, city, state,
  opening_hours, delivery_info, policies, field_provenance,
  ai_ready_score, view_count
) values (
  '11111111-1111-4111-8111-111111111111',
  'oooh-lala-shawarma',
  'Oooh Lala Shawarma',
  'Shawarma Restaurant',
  'Oooh Lala Shawarma serves fresh, made-to-order shawarma and grilled specialties in Ayobo, Lagos. Known for generous fillings and a signature spicy sauce.',
  'published',
  'verified', 'manual', now() - interval '3 days',
  '+2348030001122', '+2348030001122', 'hello@ooohlalashawarma.ng', null,
  '14 Ayobo Road, Ayobo', 'Lagos', 'Lagos',
  '{"mon":{"open":"09:00","close":"21:00","closed":false},
    "tue":{"open":"09:00","close":"21:00","closed":false},
    "wed":{"open":"09:00","close":"21:00","closed":false},
    "thu":{"open":"09:00","close":"21:00","closed":false},
    "fri":{"open":"09:00","close":"22:00","closed":false},
    "sat":{"open":"10:00","close":"22:00","closed":false},
    "sun":{"open":"12:00","close":"20:00","closed":false}}'::jsonb,
  '{"available": true, "fee": "unknown", "note": "Delivery within Ayobo and environs via WhatsApp order"}'::jsonb,
  'Orders are prepared fresh; please allow 15-20 minutes during peak hours.',
  jsonb_build_object(
    'description', jsonb_build_object('source', 'merchant_provided', 'updated_at', (now() - interval '2 days')),
    'opening_hours', jsonb_build_object('source', 'merchant_confirmed', 'updated_at', (now() - interval '2 days')),
    'address', jsonb_build_object('source', 'merchant_provided', 'updated_at', (now() - interval '3 days')),
    'delivery_info', jsonb_build_object('source', 'merchant_provided', 'updated_at', (now() - interval '2 days'))
  ),
  92, 0
);

insert into business_sources (business_id, type, value, status) values
  ('11111111-1111-4111-8111-111111111111', 'whatsapp', '+2348030001122', 'connected'),
  ('11111111-1111-4111-8111-111111111111', 'instagram', 'https://instagram.com/ooohlalashawarma', 'pending'),
  ('11111111-1111-4111-8111-111111111111', 'jumia', null, 'pending');

insert into products (
  id, business_id, name, description, price_cents, currency,
  availability, price_source, availability_source,
  price_updated_at, availability_updated_at, position
) values
  ('21111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   'Chicken Shawarma', 'Grilled chicken, fresh vegetables, signature spicy sauce, wrapped in soft flatbread.',
   450000, 'NGN', 'available', 'merchant_provided', 'merchant_confirmed',
   now() - interval '8 minutes', now() - interval '8 minutes', 1),
  ('22111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   'Beef Shawarma', 'Seasoned beef strips, fresh vegetables, garlic sauce, wrapped in soft flatbread.',
   500000, 'NGN', 'available', 'merchant_provided', 'merchant_provided',
   now() - interval '8 minutes', now() - interval '1 day', 2),
  ('23111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   'Loaded Fries', 'Crispy fries topped with grilled chicken bits and cheese sauce.',
   250000, 'NGN', 'unknown', 'merchant_provided', 'unknown',
   now() - interval '1 day', null, 3),
  ('24111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   'Zobo Drink', 'Chilled house-made zobo with ginger and pineapple.',
   100000, 'NGN', 'available', 'imported', 'merchant_confirmed',
   now() - interval '5 days', now() - interval '1 day', 4);

insert into business_images (business_id, product_id, url, is_primary) values
  ('11111111-1111-4111-8111-111111111111', null,
   'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''800'' height=''450''%3E%3Crect width=''800'' height=''450'' fill=''%23123c2e''/%3E%3Ctext x=''400'' y=''235'' fill=''%23faf8f4'' font-size=''40'' font-family=''sans-serif'' text-anchor=''middle''%3EOooh Lala Shawarma%3C/text%3E%3C/svg%3E',
   true),
  ('11111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111111',
   'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''480'' height=''360''%3E%3Crect width=''480'' height=''360'' fill=''%231c5a44''/%3E%3Ctext x=''240'' y=''180'' fill=''%23faf8f4'' font-size=''26'' font-family=''sans-serif'' text-anchor=''middle''%3EChicken Shawarma%3C/text%3E%3C/svg%3E',
   true),
  ('11111111-1111-4111-8111-111111111111', '22111111-1111-4111-8111-111111111111',
   'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''480'' height=''360''%3E%3Crect width=''480'' height=''360'' fill=''%231c5a44''/%3E%3Ctext x=''240'' y=''180'' fill=''%23faf8f4'' font-size=''26'' font-family=''sans-serif'' text-anchor=''middle''%3EBeef Shawarma%3C/text%3E%3C/svg%3E',
   true),
  ('11111111-1111-4111-8111-111111111111', '23111111-1111-4111-8111-111111111111',
   'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''480'' height=''360''%3E%3Crect width=''480'' height=''360'' fill=''%231c5a44''/%3E%3Ctext x=''240'' y=''180'' fill=''%23faf8f4'' font-size=''26'' font-family=''sans-serif'' text-anchor=''middle''%3ELoaded Fries%3C/text%3E%3C/svg%3E',
   true),
  ('11111111-1111-4111-8111-111111111111', '24111111-1111-4111-8111-111111111111',
   'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' width=''480'' height=''360''%3E%3Crect width=''480'' height=''360'' fill=''%231c5a44''/%3E%3Ctext x=''240'' y=''180'' fill=''%23faf8f4'' font-size=''26'' font-family=''sans-serif'' text-anchor=''middle''%3EZobo Drink%3C/text%3E%3C/svg%3E',
   true);

insert into reviews (business_id, author_name, rating, body, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'Tosin A.', 5, 'Best shawarma in Ayobo, hands down. Generous fillings every time.', now() - interval '6 days'),
  ('11111111-1111-4111-8111-111111111111', 'Chidera O.', 4, 'Really good, though it took a bit longer than expected on a Friday night.', now() - interval '12 days');
