import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbhzqsqfwkvmbucmnzaa.supabase.co';
const supabaseKey = 'sb_publishable__CAKu-3zHZQKlLf6HmxT3g_jA86nIYg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function purge() {
    console.log("Deep Purging DB...");

    // First delete all orders
    await supabase.from('orders').delete().neq('status', 'DUMMY_STATUS');

    // Delete all products
    await supabase.from('products').delete().neq('name', 'DUMMY_PRODUCT');

    // Delete all users
    await supabase.from('users').delete().neq('email', 'DUMMY_EMAIL');

    console.log("DB Purged. Running Seed...");
    require('./seed_advanced_data.js');
}

purge();
