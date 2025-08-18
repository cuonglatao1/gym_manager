-- Migration: Create Maintenance Schedule and History Tables
-- Created: 2025-08-18
-- Description: Add automatic maintenance scheduling and history tracking

-- First, update existing ENUM types to match our models
DO $$ BEGIN
    -- Update maintenance_type to include our new types
    CREATE TYPE maintenance_type_new AS ENUM ('daily_clean', 'weekly_check', 'monthly_maintenance', 'repair', 'replacement');
    
    -- Check if the old enum exists and has data
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
        -- If equipment_maintenance table exists and has data, we need to be careful
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_maintenance') THEN
            -- Update the existing column to use the new enum
            ALTER TABLE equipment_maintenance ADD COLUMN maintenance_type_new maintenance_type_new;
            
            -- Map old values to new values
            UPDATE equipment_maintenance SET maintenance_type_new = 
                CASE 
                    WHEN maintenance_type::text = 'routine' THEN 'monthly_maintenance'
                    WHEN maintenance_type::text = 'cleaning' THEN 'daily_clean'
                    WHEN maintenance_type::text = 'inspection' THEN 'weekly_check'
                    WHEN maintenance_type::text = 'repair' THEN 'repair'
                    WHEN maintenance_type::text = 'calibration' THEN 'weekly_check'
                    WHEN maintenance_type::text = 'emergency' THEN 'repair'
                    ELSE 'monthly_maintenance'
                END;
            
            -- Drop the old column and rename the new one
            ALTER TABLE equipment_maintenance DROP COLUMN maintenance_type;
            ALTER TABLE equipment_maintenance RENAME COLUMN maintenance_type_new TO maintenance_type;
        END IF;
        
        -- Drop the old enum type
        DROP TYPE maintenance_type;
    END IF;
    
    -- Rename the new type to the standard name
    ALTER TYPE maintenance_type_new RENAME TO maintenance_type;
    
EXCEPTION
    WHEN duplicate_object THEN 
        -- If the new enum already exists, just continue
        NULL;
    WHEN others THEN
        -- Create the enum if it doesn't exist at all
        CREATE TYPE maintenance_type AS ENUM ('daily_clean', 'weekly_check', 'monthly_maintenance', 'repair', 'replacement');
END $$;

-- Add equipment_size enum and priority enum for equipment
DO $$ BEGIN
    CREATE TYPE equipment_size AS ENUM ('large', 'small');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create maintenance_schedule_type enum
DO $$ BEGIN
    CREATE TYPE maintenance_schedule_type AS ENUM ('cleaning', 'inspection', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create maintenance_result enum for history
DO $$ BEGIN
    CREATE TYPE maintenance_result AS ENUM ('completed', 'partial', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update equipment table to add missing columns
DO $$ BEGIN
    -- Add equipment_size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'equipment_size') THEN
        ALTER TABLE equipment ADD COLUMN equipment_size equipment_size NOT NULL DEFAULT 'large';
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'priority') THEN
        ALTER TABLE equipment ADD COLUMN priority equipment_priority NOT NULL DEFAULT 'medium';
    END IF;
END $$;

-- Create MaintenanceSchedule table
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_type maintenance_schedule_type NOT NULL,
    priority equipment_priority NOT NULL,
    interval_days INTEGER NOT NULL,
    next_due_date DATE NOT NULL,
    last_completed_date DATE,
    is_active BOOLEAN DEFAULT true,
    auto_generated BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create MaintenanceHistory table
CREATE TABLE IF NOT EXISTS maintenance_history (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_id INTEGER REFERENCES equipment_maintenance(id) ON DELETE SET NULL,
    schedule_id INTEGER REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    maintenance_type maintenance_type NOT NULL,
    performed_date DATE NOT NULL,
    performed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    duration INTEGER,
    work_performed TEXT NOT NULL,
    issues_found TEXT,
    parts_replaced JSON,
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    equipment_condition_before equipment_condition,
    equipment_condition_after equipment_condition NOT NULL,
    priority maintenance_priority NOT NULL DEFAULT 'medium',
    result maintenance_result NOT NULL DEFAULT 'completed',
    next_maintenance_recommended DATE,
    photos JSON,
    notes TEXT,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    is_warranty_work BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_equipment_id ON maintenance_schedules(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due_date ON maintenance_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_priority ON maintenance_schedules(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_type ON maintenance_schedules(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_active ON maintenance_schedules(is_active);

CREATE INDEX IF NOT EXISTS idx_maintenance_history_equipment_id ON maintenance_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_performed_date ON maintenance_history(performed_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_performed_by ON maintenance_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_maintenance_id ON maintenance_history(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_schedule_id ON maintenance_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_type ON maintenance_history(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_result ON maintenance_history(result);

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_maintenance_schedules_updated_at ON maintenance_schedules;
CREATE TRIGGER update_maintenance_schedules_updated_at
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_history_updated_at ON maintenance_history;
CREATE TRIGGER update_maintenance_history_updated_at
    BEFORE UPDATE ON maintenance_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for existing equipment
INSERT INTO maintenance_schedules (equipment_id, maintenance_type, priority, interval_days, next_due_date, auto_generated, notes)
SELECT 
    id as equipment_id,
    'cleaning' as maintenance_type,
    COALESCE(priority, 'medium'::equipment_priority) as priority,
    CASE 
        WHEN COALESCE(priority, 'medium'::equipment_priority) = 'high' THEN 1
        WHEN COALESCE(priority, 'medium'::equipment_priority) = 'medium' THEN 3
        ELSE 7
    END as interval_days,
    CURRENT_DATE + INTERVAL '1 day' as next_due_date,
    true as auto_generated,
    'Auto-generated cleaning schedule'
FROM equipment 
WHERE is_active = true AND NOT EXISTS (
    SELECT 1 FROM maintenance_schedules WHERE equipment_id = equipment.id AND maintenance_type = 'cleaning'
);

INSERT INTO maintenance_schedules (equipment_id, maintenance_type, priority, interval_days, next_due_date, auto_generated, notes)
SELECT 
    id as equipment_id,
    'inspection' as maintenance_type,
    COALESCE(priority, 'medium'::equipment_priority) as priority,
    CASE 
        WHEN COALESCE(priority, 'medium'::equipment_priority) = 'high' THEN 7
        WHEN COALESCE(priority, 'medium'::equipment_priority) = 'medium' THEN 14
        ELSE 30
    END as interval_days,
    CURRENT_DATE + INTERVAL '1 week' as next_due_date,
    true as auto_generated,
    'Auto-generated inspection schedule'
FROM equipment 
WHERE is_active = true AND NOT EXISTS (
    SELECT 1 FROM maintenance_schedules WHERE equipment_id = equipment.id AND maintenance_type = 'inspection'
);

INSERT INTO maintenance_schedules (equipment_id, maintenance_type, priority, interval_days, next_due_date, auto_generated, notes)
SELECT 
    id as equipment_id,
    'maintenance' as maintenance_type,
    COALESCE(priority, 'medium'::equipment_priority) as priority,
    CASE 
        WHEN COALESCE(priority, 'medium'::equipment_priority) = 'high' THEN 30
        WHEN COALESCE(priority, 'medium'::equipment_priority) = 'medium' THEN 60
        ELSE 90
    END as interval_days,
    CURRENT_DATE + INTERVAL '1 month' as next_due_date,
    true as auto_generated,
    'Auto-generated maintenance schedule'
FROM equipment 
WHERE is_active = true AND NOT EXISTS (
    SELECT 1 FROM maintenance_schedules WHERE equipment_id = equipment.id AND maintenance_type = 'maintenance'
);

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_schedules TO gym_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_history TO gym_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE maintenance_schedules_id_seq TO gym_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE maintenance_history_id_seq TO gym_app_user;

COMMIT;