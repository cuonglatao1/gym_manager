-- Migration: Create Equipment Management Tables
-- Created: 2025-08-17

-- Create Equipment table
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category equipment_category NOT NULL DEFAULT 'other',
    brand VARCHAR(50),
    model VARCHAR(50),
    serial_number VARCHAR(50),
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    warranty_end_date DATE,
    location VARCHAR(100),
    status equipment_status NOT NULL DEFAULT 'active',
    condition equipment_condition NOT NULL DEFAULT 'excellent',
    specifications JSON,
    maintenance_interval INTEGER DEFAULT 30,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Equipment Maintenance table
CREATE TABLE IF NOT EXISTS equipment_maintenance (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_type maintenance_type NOT NULL DEFAULT 'routine',
    status maintenance_status NOT NULL DEFAULT 'scheduled',
    priority maintenance_priority NOT NULL DEFAULT 'medium',
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    issue_details TEXT,
    work_performed TEXT,
    parts_used JSON,
    cost DECIMAL(10, 2) DEFAULT 0.00,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    next_maintenance_date DATE,
    photos JSON,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_interval INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ENUM types for Equipment
DO $$ BEGIN
    CREATE TYPE equipment_category AS ENUM ('cardio', 'strength', 'functional', 'free_weights', 'accessories', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_status AS ENUM ('active', 'maintenance', 'broken', 'retired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_condition AS ENUM ('excellent', 'good', 'fair', 'poor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ENUM types for Equipment Maintenance
DO $$ BEGIN
    CREATE TYPE maintenance_type AS ENUM ('routine', 'repair', 'inspection', 'cleaning', 'calibration', 'emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_location ON equipment(location);
CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance ON equipment(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment(equipment_code);
CREATE INDEX IF NOT EXISTS idx_equipment_serial ON equipment(serial_number);

CREATE INDEX IF NOT EXISTS idx_maintenance_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON equipment_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled_date ON equipment_maintenance(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON equipment_maintenance(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_type ON equipment_maintenance(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON equipment_maintenance(priority);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_maintenance_updated_at ON equipment_maintenance;
CREATE TRIGGER update_equipment_maintenance_updated_at
    BEFORE UPDATE ON equipment_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample equipment data
INSERT INTO equipment (equipment_code, name, category, brand, model, location, status, condition, maintenance_interval, specifications) VALUES
('CD25001', 'Treadmill Pro X1', 'cardio', 'TechFit', 'ProX1-2024', 'Floor 1 - Cardio Area', 'active', 'excellent', 7, '{"max_speed": "20 km/h", "incline": "0-15%", "programs": 12}'),
('ST25001', 'Lat Pulldown Machine', 'strength', 'IronForce', 'LPD-450', 'Floor 1 - Strength Area', 'active', 'good', 14, '{"weight_stack": "100kg", "adjustable_seat": true}'),
('FW25001', 'Olympic Barbell Set', 'free_weights', 'PowerLift', 'OLY-45', 'Floor 1 - Free Weights', 'active', 'excellent', 30, '{"weight": "20kg", "length": "220cm", "plates_included": "2x20kg, 4x10kg, 4x5kg"}'),
('CD25002', 'Stationary Bike Elite', 'cardio', 'CycleTech', 'Elite-2024', 'Floor 1 - Cardio Area', 'active', 'excellent', 7, '{"resistance_levels": 20, "heart_rate_monitor": true, "display": "LCD"}'),
('ST25002', 'Leg Press Machine', 'strength', 'IronForce', 'LP-800', 'Floor 1 - Strength Area', 'maintenance', 'good', 14, '{"weight_capacity": "500kg", "angle": "45 degrees"}'
);

-- Insert sample maintenance records
INSERT INTO equipment_maintenance (equipment_id, maintenance_type, status, priority, scheduled_date, title, description, estimated_duration) VALUES
((SELECT id FROM equipment WHERE equipment_code = 'CD25001'), 'routine', 'scheduled', 'medium', CURRENT_DATE + INTERVAL '3 days', 'Weekly treadmill maintenance', 'Regular cleaning and belt inspection', 30),
((SELECT id FROM equipment WHERE equipment_code = 'ST25002'), 'repair', 'in_progress', 'high', CURRENT_DATE, 'Fix hydraulic system', 'Hydraulic cylinder needs replacement', 120),
((SELECT id FROM equipment WHERE equipment_code = 'CD25002'), 'cleaning', 'scheduled', 'low', CURRENT_DATE + INTERVAL '1 day', 'Deep cleaning', 'Monthly deep cleaning and lubrication', 45);

COMMIT;