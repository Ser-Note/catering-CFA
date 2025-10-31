-- cleanup-old-orders.sql - Delete orders older than one month
-- Run this script in your Supabase SQL editor to clean up old orders

-- Set the cutoff date (1 month ago from today)
-- You can adjust this date as needed
DO $$
DECLARE
    cutoff_date DATE := CURRENT_DATE - INTERVAL '1 month';
    email_orders_deleted INTEGER;
    catering_orders_deleted INTEGER;
    total_deleted INTEGER;
BEGIN
    -- Log the start of cleanup
    RAISE NOTICE 'Starting database cleanup for orders older than %', cutoff_date;
    
    -- Count orders to be deleted (for logging)
    SELECT COUNT(*) INTO email_orders_deleted 
    FROM email_orders 
    WHERE order_date < cutoff_date;
    
    SELECT COUNT(*) INTO catering_orders_deleted 
    FROM catering_orders 
    WHERE order_date < cutoff_date;
    
    total_deleted := email_orders_deleted + catering_orders_deleted;
    
    RAISE NOTICE 'Found % email orders and % catering orders to delete', 
                 email_orders_deleted, catering_orders_deleted;
    
    -- Only proceed if there are orders to delete
    IF total_deleted > 0 THEN
        -- Delete old email orders
        DELETE FROM email_orders 
        WHERE order_date < cutoff_date;
        
        -- Delete old catering orders  
        DELETE FROM catering_orders 
        WHERE order_date < cutoff_date;
        
        -- Log the results
        INSERT INTO debug_logs (message) 
        VALUES (FORMAT('Database cleanup completed - deleted %s orders (%s email, %s catering) older than %s', 
                      total_deleted, email_orders_deleted, catering_orders_deleted, cutoff_date));
        
        RAISE NOTICE 'Cleanup completed successfully! Deleted % total orders', total_deleted;
    ELSE
        RAISE NOTICE 'No old orders found - database is already clean!';
        
        INSERT INTO debug_logs (message) 
        VALUES ('Database cleanup completed - no old orders found');
    END IF;
    
END $$;

-- Optional: View recent debug logs to confirm cleanup
SELECT message, created_at 
FROM debug_logs 
WHERE message LIKE '%cleanup%' 
ORDER BY created_at DESC 
LIMIT 5;