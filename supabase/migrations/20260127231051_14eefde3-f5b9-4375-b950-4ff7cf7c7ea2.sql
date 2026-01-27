-- First delete raw data (child table)
DELETE FROM bill_raw_data WHERE bill_analysis_id IN (
  SELECT ba.id FROM bill_analyses ba
  JOIN properties p ON p.id = ba.property_id
  WHERE p.owner_id = '834a4e7c-93c9-4620-b087-e4c302fee255'
);

-- Then delete analyses
DELETE FROM bill_analyses WHERE property_id IN (
  SELECT id FROM properties WHERE owner_id = '834a4e7c-93c9-4620-b087-e4c302fee255'
);