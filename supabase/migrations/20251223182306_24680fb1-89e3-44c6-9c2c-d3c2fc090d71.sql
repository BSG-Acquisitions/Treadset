-- 1. Update Auto Center of Canton: remove email, mark inactive, add note
UPDATE public.clients 
SET 
  email = NULL,
  is_active = false,
  notes = COALESCE(notes, '') || E'\n[2024-12-23] Marked inactive - business closed. Email removed per former employee (Ken) request.',
  updated_at = now()
WHERE id = '35f47af5-0559-44d0-b143-f46d1fd9ae83';

-- 2. Fully opt out from all email communications
UPDATE public.client_email_preferences
SET 
  can_receive_outreach = false,
  can_receive_reminders = false,
  can_receive_confirmations = false,
  unsubscribed_at = now(),
  unsubscribe_reason = 'Former employee requested removal - business no longer operating',
  updated_at = now()
WHERE client_id = '35f47af5-0559-44d0-b143-f46d1fd9ae83';