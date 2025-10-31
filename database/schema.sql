-- Database schema for Catering CFA application
-- Run these commands in your Supabase SQL editor

-- 1. Employees table (replaces employee.json)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Check-ins table (replaces checkIn.json)
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) NOT NULL,
    check_in_date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Debug logs table (replaces debug_log.json)
CREATE TABLE IF NOT EXISTS debug_logs (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Catering orders table (replaces catering.json)
CREATE TABLE IF NOT EXISTS catering_orders (
    id SERIAL PRIMARY KEY,
    order_date DATE,
    organization VARCHAR(255),
    num_sandwiches INTEGER DEFAULT 0,
    other_items TEXT,
    sauces TEXT,
    cost DECIMAL(10,2) DEFAULT 0,
    paid BOOLEAN DEFAULT FALSE,
    order_type VARCHAR(100),
    time_of_day VARCHAR(50),
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    pickles VARCHAR(10) DEFAULT 'no',
    num_bags INTEGER DEFAULT 0,
    creator VARCHAR(255),
    last_edited_by VARCHAR(255),
    completed_boh BOOLEAN DEFAULT FALSE,
    completed_foh BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Email orders table (for orders from fetchCatering.js, replaces orders.json)
CREATE TABLE IF NOT EXISTS email_orders (
    id SERIAL PRIMARY KEY,
    order_type VARCHAR(50) NOT NULL, -- 'Pickup' or 'Delivery'
    order_date DATE,
    order_time VARCHAR(50),
    destination TEXT,
    customer_name VARCHAR(255),
    phone_number VARCHAR(50),
    customer_email VARCHAR(255),
    guest_count VARCHAR(50),
    paper_goods VARCHAR(10) DEFAULT 'No',
    special_instructions TEXT,
    food_items JSONB DEFAULT '[]',
    drink_items JSONB DEFAULT '[]',
    sauces_dressings JSONB DEFAULT '[]',
    meal_boxes JSONB DEFAULT '[]',
    total VARCHAR(50),
    paid BOOLEAN DEFAULT FALSE,
    completed_boh BOOLEAN DEFAULT FALSE,
    completed_foh BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(fname, lname);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_catering_orders_date ON catering_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_email_orders_date ON email_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created ON debug_logs(created_at);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_orders ENABLE ROW LEVEL SECURITY;

-- 6. Users table (replaces users.json) - for secure password authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 7. Temporary credentials table (replaces temp-creds.csv)
CREATE TABLE IF NOT EXISTS temp_creds (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    temp_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_temp_creds_username ON temp_creds(username);
CREATE INDEX IF NOT EXISTS idx_temp_creds_expires ON temp_creds(expires_at);

-- Enable Row Level Security
ALTER TABLE temp_creds ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed based on your authentication requirements)
-- For now, allow all operations (you can restrict these later)
CREATE POLICY "Allow all operations on employees" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all operations on check_ins" ON check_ins FOR ALL USING (true);
CREATE POLICY "Allow all operations on debug_logs" ON debug_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on catering_orders" ON catering_orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on email_orders" ON email_orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on temp_creds" ON temp_creds FOR ALL USING (true);