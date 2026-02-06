-- Create a new bucket for chat uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-uploads', 'chat-uploads', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-uploads');

-- Policy to allow authenticated users to view files
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat-uploads');

-- Policy to allow public access (optional, if we want public signed urls easier, else use signed urls)
-- For now, keep it authenticated for security, but Inspector needs access. 
-- Since Inspector runs on Edge Function with Service Role, it bypasses RLS.
