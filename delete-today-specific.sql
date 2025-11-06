-- Delete orders from today (2025-11-06) so they can be re-fetched with the new parsing logic
-- Run this in your Supabase SQL Editor

-- Step 1: See what orders will be deleted
SELECT id, customer_name, order_date, order_time, total, 
       jsonb_array_length(COALESCE(meal_boxes, '[]'::jsonb)) as meal_boxes_count,
       jsonb_array_length(COALESCE(food_items, '[]'::jsonb)) as food_items_count
FROM email_orders
WHERE order_date = '2025-11-06'
ORDER BY id DESC;

-- Step 2: After confirming, delete them (uncomment the line below)
-- DELETE FROM email_orders WHERE order_date = '2025-11-06';

-- Step 3: Verify they're gone
-- SELECT COUNT(*) FROM email_orders WHERE order_date = '2025-11-06';

/*
After running the DELETE:
1. Go to your catering app
2. Click the "🔄 Refresh Orders" button
3. Check the terminal/console logs - you should see detailed parsing output
4. The packaged meals should now appear combined with their components
*/
