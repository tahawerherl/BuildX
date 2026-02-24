import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbhzqsqfwkvmbucmnzaa.supabase.co';
const supabaseKey = 'sb_publishable__CAKu-3zHZQKlLf6HmxT3g_jA86nIYg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeAndSeed() {
    console.log("Forcing wipe of all users, products, and orders...");

    // Fetch all users to delete them one by one
    const { data: users, error: fetchError } = await supabase.from('users').select('id, email, seller_id');
    if (fetchError) {
        console.error("Error fetching users:", fetchError);
        return;
    }

    if (users && users.length > 0) {
        console.log(`Found ${users.length} users to delete.`);
        const emailsToDelete = users.map(u => u.email);
        const sellerIdsToDelete = users.filter(u => u.seller_id).map(u => u.seller_id);

        if (sellerIdsToDelete.length > 0) {
            await supabase.from('products').delete().in('seller_id', sellerIdsToDelete);
            console.log("Deleted old products.");
        }

        await supabase.from('users').delete().in('email', emailsToDelete);
        console.log("Deleted old users.");
    } else {
        console.log("No existing users found.");
    }
}

wipeAndSeed();
