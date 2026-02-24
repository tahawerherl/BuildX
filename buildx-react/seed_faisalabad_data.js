import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbhzqsqfwkvmbucmnzaa.supabase.co';
const supabaseKey = 'sb_publishable__CAKu-3zHZQKlLf6HmxT3g_jA86nIYg';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SELLER_ROLES = 'seller';
const BUYER_ROLES = 'buyer';

const seedFaisalabadData = async () => {
    console.log("Starting Faisalabad Data Seeding...");

    // 1. Create Sellers
    const sellers = [
        { role: SELLER_ROLES, name: 'Madina Hardware Team', email: 'madina@buildx.com', phone: '0300-1111111', password: 'password123', brand_name: 'Madina Tools & Hardware', address: 'D-Ground, Faisalabad', seller_id: 'MADINA-101' },
        { role: SELLER_ROLES, name: 'FESD Admin', email: 'faisalabad_electric@buildx.com', phone: '0300-2222222', password: 'password123', brand_name: 'Faisalabad Electric Store', address: 'Peoples Colony, Faisalabad', seller_id: 'FESD-202' },
        { role: SELLER_ROLES, name: 'Lyallpur Steel', email: 'lyallpur@buildx.com', phone: '0300-3333333', password: 'password123', brand_name: 'Lyallpur Construction Supplies', address: 'Sargodha Road, Faisalabad', seller_id: 'LCS-303' },
        { role: SELLER_ROLES, name: 'Chenab Tiles', email: 'chenab@buildx.com', phone: '0300-4444444', password: 'password123', brand_name: 'Chenab Sanitary & Tiles', address: 'Samundri Road, Faisalabad', seller_id: 'CHEN-404' },
        { role: SELLER_ROLES, name: 'Kohinoor Home', email: 'kohinoor@buildx.com', phone: '0300-5555555', password: 'password123', brand_name: 'Kohinoor Home Improvement', address: 'Kohinoor City, Faisalabad', seller_id: 'KOHI-505' }
    ];

    console.log("Inserting Sellers...");
    const { data: insertedSellers, error: sellerError } = await supabase.from('users').upsert(sellers, { onConflict: 'email' }).select();
    if (sellerError) {
        console.error("Seller Insert Error:", sellerError);
        return;
    }

    // 2. Create Buyers
    const buyers = [
        { role: BUYER_ROLES, name: 'Ahmed Raza', email: 'ahmed@example.com', phone: '0321-1234567', password: 'password123', address: 'Madina Town, Faisalabad' },
        { role: BUYER_ROLES, name: 'Usman Ali', email: 'usman@example.com', phone: '0300-9876543', password: 'password123', address: 'Gulberg, Faisalabad' },
        { role: BUYER_ROLES, name: 'Fatima Bilal', email: 'fatima@example.com', phone: '0333-7654321', password: 'password123', address: 'Civil Lines, Faisalabad' }
    ];

    console.log("Inserting Buyers...");
    const { error: buyerError } = await supabase.from('users').upsert(buyers, { onConflict: 'email' });
    if (buyerError) {
        console.error("Buyer Insert Error:", buyerError);
        return;
    }

    // 3. Create Products for Sellers
    const products = [
        // Madina Tools & Hardware (D-Ground)
        { seller_id: 'MADINA-101', name: 'Industrial Grade Power Drill 20V', category: 'Tools', price: 14500, stock: 45, image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&auto=format&fit=crop', description: 'Heavy-duty 20V max cordless drill perfect for concrete and wood.' },
        { seller_id: 'MADINA-101', name: 'Professional Claw Hammer', category: 'Tools', price: 1200, stock: 120, image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500&auto=format&fit=crop', description: 'Drop-forged steel head with fiberglass handle for shock absorption.' },
        { seller_id: 'MADINA-101', name: '100-Piece Mechanic Tool Set', category: 'Tools', price: 21000, stock: 15, image: 'https://plus.unsplash.com/premium_photo-1664302152996-2224df0ed04c?w=500&auto=format&fit=crop', description: 'Complete socket and wrench set in a durable molded case.' },
        { seller_id: 'MADINA-101', name: 'Heavy Duty Tape Measure 8m', category: 'Tools', price: 850, stock: 200, image: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=500&auto=format&fit=crop', description: 'Nylon-coated blade with magnetic hook.' },
        { seller_id: 'MADINA-101', name: 'Angle Grinder 4.5 Inch', category: 'Tools', price: 6500, stock: 35, image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=500&auto=format&fit=crop', description: '7.5 Amp motor for high-speed cutting and grinding.' },

        // Faisalabad Electric Store (People's Colony)
        { seller_id: 'FESD-202', name: 'Copper Core Insulated Wire 3/029', category: 'Electrical', price: 4200, stock: 50, image: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=500&auto=format&fit=crop', description: 'Pure copper wire coil (90m) for residential wiring.' },
        { seller_id: 'FESD-202', name: 'LED Panel Light 12W (Pack of 4)', category: 'Electrical', price: 3600, stock: 80, image: 'https://images.unsplash.com/photo-1563630381-8b2b73010b94?w=500&auto=format&fit=crop', description: 'Energy-saving recessed SMD ceiling lights, daylight white.' },
        { seller_id: 'FESD-202', name: 'AC Circuit Breaker 32A', category: 'Electrical', price: 1100, stock: 150, image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500&auto=format&fit=crop', description: 'Miniature overload protection switch for home appliances.' },
        { seller_id: 'FESD-202', name: 'Luxury Switch Board Series', category: 'Electrical', price: 850, stock: 300, image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&auto=format&fit=crop', description: 'Modern tempered glass wall switch sockets.' },
        { seller_id: 'FESD-202', name: 'Industrial Exhaust Fan 24"', category: 'Electrical', price: 12500, stock: 10, image: 'https://images.unsplash.com/photo-1520695287271-92beebfc7756?w=500&auto=format&fit=crop', description: 'High RPM heavy-duty metal exhaust fan for warehouses.' },

        // Lyallpur Construction Supplies (Sargodha Road)
        { seller_id: 'LCS-303', name: 'Portland Cement Bag (50kg)', category: 'Construction', price: 1250, stock: 500, image: 'https://images.unsplash.com/photo-1622359286282-f673f47b2c5c?w=500&auto=format&fit=crop', description: 'OPC Grade 53 cement for strong concrete foundations.' },
        { seller_id: 'LCS-303', name: 'Deformed Steel Rebar (Grade 60)', category: 'Construction', price: 295000, stock: 20, image: 'https://images.unsplash.com/photo-1533668102462-8e10086fb401?w=500&auto=format&fit=crop', description: 'Price per ton. High-tensile steel bars for structural reinforcement.' },
        { seller_id: 'LCS-303', name: 'Red Clay Bricks (Pallet of 1000)', category: 'Construction', price: 14000, stock: 50, image: 'https://images.unsplash.com/photo-1582035905186-b4edbc140ac2?w=500&auto=format&fit=crop', description: 'A-Class solid fired clay bricks.' },
        { seller_id: 'LCS-303', name: 'Fine Ravi Sand (1 Trolley)', category: 'Construction', price: 8500, stock: 100, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop', description: 'Filtered fine river sand ideal for plastering.' },
        { seller_id: 'LCS-303', name: 'Waterproofing Chemical (20L)', category: 'Construction', price: 9500, stock: 40, image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop', description: 'Acrylic based roof waterproofing membrane.' },

        // Chenab Sanitary & Tiles (Samundri Road)
        { seller_id: 'CHEN-404', name: 'Premium PVC Pipe 4-inch (Per Length)', category: 'Plumbing', price: 2100, stock: 150, image: 'https://images.unsplash.com/photo-1585805562095-f1fb4f4ff4d8?w=500&auto=format&fit=crop', description: 'Schedule 40 durable PVC pipe for sewerage systems.' },
        { seller_id: 'CHEN-404', name: 'Ceramic Floor Tiles 24x24', category: 'Tiles', price: 1800, stock: 300, image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop', description: 'Price per meter square. Glossy finish marble texture.' },
        { seller_id: 'CHEN-404', name: 'Stainless Steel Kitchen Sink', category: 'Plumbing', price: 8500, stock: 25, image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&auto=format&fit=crop', description: 'Double bowl 304 grade sink with noise reduction.' },
        { seller_id: 'CHEN-404', name: 'Brass Bathroom Faucet', category: 'Plumbing', price: 4200, stock: 60, image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop', description: 'Rust-free luxury chrome finish basin mixer hanger.' },
        { seller_id: 'CHEN-404', name: 'PPR Fittings Kit', category: 'Plumbing', price: 3500, stock: 90, image: 'https://images.unsplash.com/photo-1616422285623-149b1a8dba0d?w=500&auto=format&fit=crop', description: 'Assorted elbows, Ts, and joints for hot water plumbing.' }
    ];

    console.log("Inserting Products...");
    // Only insert if matching items don't exist to avoid massive duplicates on re-runs (simple approach)
    for (const prod of products) {
        const { data: existing } = await supabase.from('products').select('id').eq('seller_id', prod.seller_id).eq('name', prod.name).limit(1);
        if (!existing || existing.length === 0) {
            await supabase.from('products').insert([prod]);
        }
    }

    console.log("Seeding Complete! Local Faisalabad Data has been populated into Supabase.");
};

seedFaisalabadData().catch(console.error);
