-- Alter spark_ledger check constraint to support customization_purchase
ALTER TABLE spark_ledger DROP CONSTRAINT IF EXISTS spark_ledger_source_type_check;

ALTER TABLE spark_ledger ADD CONSTRAINT spark_ledger_source_type_check 
CHECK (source_type IN (
  'routine_complete', 'goal_microtask', 'goal_complete',
  'emotional_checkin', 'parent_bonus', 'redemption', 'customization_purchase'
));
