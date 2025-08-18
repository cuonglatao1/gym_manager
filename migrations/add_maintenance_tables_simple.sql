-- Simple migration: Add maintenance schedule and history tables
-- Created: 2025-08-18

-- Add missing equipment columns if they don't exist
DO $$ BEGIN
    -- Add equipment_size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'equipment_size') THEN
        -- First create the enum if it doesn't exist
        CREATE TYPE equipment_size AS ENUM ('large', 'small');
        ALTER TABLE equipment ADD COLUMN equipment_size equipment_size NOT NULL DEFAULT 'large';
    END IF;
    
    -- Add priority column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'priority') THEN
        -- First create the enum if it doesn't exist
        CREATE TYPE equipment_priority AS ENUM ('high', 'medium', 'low');
        ALTER TABLE equipment ADD COLUMN priority equipment_priority NOT NULL DEFAULT 'medium';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN 
        NULL; -- Ignore if types already exist
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

-- Update maintenance_type enum to include our new types
DO $$ BEGIN
    -- Drop old enum if it exists and recreate
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
        -- First, temporarily change any existing columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_maintenance' AND column_name = 'maintenance_type') THEN
            ALTER TABLE equipment_maintenance ALTER COLUMN maintenance_type TYPE text;
        END IF;
        DROP TYPE maintenance_type CASCADE;
    END IF;
    
    -- Create the new enum
    CREATE TYPE maintenance_type AS ENUM ('daily_clean', 'weekly_check', 'monthly_maintenance', 'repair', 'replacement');
    
    -- Update the column to use the new enum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_maintenance' AND column_name = 'maintenance_type') THEN
        ALTER TABLE equipment_maintenance ALTER COLUMN maintenance_type TYPE maintenance_type USING 
            CASE 
                WHEN maintenance_type = 'routine' THEN 'monthly_maintenance'::maintenance_type
                WHEN maintenance_type = 'cleaning' THEN 'daily_clean'::maintenance_type
                WHEN maintenance_type = 'inspection' THEN 'weekly_check'::maintenance_type
                WHEN maintenance_type = 'repair' THEN 'repair'::maintenance_type
                WHEN maintenance_type = 'calibration' THEN 'weekly_check'::maintenance_type
                WHEN maintenance_type = 'emergency' THEN 'repair'::maintenance_type
                ELSE 'monthly_maintenance'::maintenance_type
            END;
    END IF;
EXCEPTION
    WHEN others THEN
        -- If there's any issue, just create the enum
        CREATE TYPE maintenance_type AS ENUM ('daily_clean', 'weekly_check', 'monthly_maintenance', 'repair', 'replacement');
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

-- Create indexes
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

COMMIT;