-- Migration to update invoice status enum from 'draft','sent','paid','overdue','cancelled' to 'pending','paid','overdue','cancelled'
-- Run this script to update existing database

-- Update existing 'draft' and 'sent' statuses to 'pending'
UPDATE invoices SET status = 'pending' WHERE status IN ('draft', 'sent');

-- Drop the existing enum constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new enum constraint
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));

-- Update default value
ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'pending';