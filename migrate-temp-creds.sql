-- Step 1: Create the temp_creds table (run this first)
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

-- Create policy
CREATE POLICY "Allow all operations on temp_creds" ON temp_creds FOR ALL USING (true);

-- Step 2: Insert the existing temp credential from CSV
-- Replace this with your actual data from temp-creds.csv
INSERT INTO temp_creds (username, temp_password) 
VALUES ('chase.rogers', 'lcSkk97om6P')
ON CONFLICT (username) DO NOTHING;

-- Step 3: Verify the data was inserted
SELECT * FROM temp_creds;