-- Create storage policies for bills bucket
-- Allow authenticated users to upload their own bills
CREATE POLICY "Users can upload bills to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own bills
CREATE POLICY "Users can view their own bills"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/replace their own bills
CREATE POLICY "Users can update their own bills"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own bills
CREATE POLICY "Users can delete their own bills"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);