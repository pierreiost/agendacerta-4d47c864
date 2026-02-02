-- Add TRANSFER to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'TRANSFER';