import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbhzqsqfwkvmbucmnzaa.supabase.co';
const supabaseKey = 'sb_publishable__CAKu-3zHZQKlLf6HmxT3g_jA86nIYg';

const supabase = createClient(supabaseUrl, supabaseKey);

const sellers = [
    {
        name: 'Madina Hardware Team',
        email: 'madina_tools@gmail.com',
        phone: '0300-1111111',
        password: 'password123',
        role: 'seller',
        brand_name: 'Madina Tools',
        address: 'D-Ground, Faisalabad',
        city: 'Faisalabad',
        cnic: '33100-1111111-1',
        bank_account: 'PK34HABB0000001',
        seller_id: 'S-MADINA-FSD'
    },
    {
        name: 'Lyallpur Supply',
        email: 'lyallpur_hardware@gmail.com',
        phone: '0300-2222222',
        password: 'password123',
        role: 'seller',
        brand_name: 'Lyallpur Hardware',
        address: 'Sargodha Road, Faisalabad',
        city: 'Faisalabad',
        cnic: '33100-2222222-2',
        bank_account: 'PK34MBL0000002',
        seller_id: 'S-LYALLPUR-FSD'
    },
    {
        name: 'Lahore Colors',
        email: 'lahore_paint@gmail.com',
        phone: '0300-3333333',
        password: 'password123',
        role: 'seller',
        brand_name: 'Lahore Paint House',
        address: 'Ferozepur Road, Lahore',
        city: 'Lahore',
        cnic: '35200-3333333-3',
        bank_account: 'PK34UBL0000003',
        seller_id: 'S-PAINTS-LHE'
    },
    {
        name: 'Badami Electronics',
        email: 'badami_electricals@gmail.com',
        phone: '0300-4444444',
        password: 'password123',
        role: 'seller',
        brand_name: 'Badami Bagh Electricals',
        address: 'Badami Bagh, Lahore',
        city: 'Lahore',
        cnic: '35200-4444444-4',
        bank_account: 'PK34MCB0000004',
        seller_id: 'S-ELEC-LHE'
    },
    {
        name: 'Chenab Bath Fittings',
        email: 'chenab_sanitary@gmail.com',
        phone: '0300-5555555',
        password: 'password123',
        role: 'seller',
        brand_name: 'Chenab Sanitary',
        address: 'Samundri Road, Faisalabad',
        city: 'Faisalabad',
        cnic: '33100-5555555-5',
        bank_account: 'PK34BAFL0000005',
        seller_id: 'S-CHENAB-FSD'
    }
];

const products = [
    // Madina Tools
    {
        seller_id: 'S-MADINA-FSD',
        name: 'Makita 115mm Angle Grinder',
        category: 'Tools',
        price: 18500,
        stock: 25,
        image: 'https://www.aceiraq.com/cts/productImages/images/20400217.jpg',
        description: ['Heavy duty Makita angle grinder for cutting and grinding metal and stone.']
    },
    {
        seller_id: 'S-MADINA-FSD',
        name: 'Bosch Professional Rotary Hammer',
        category: 'Tools',
        price: 45000,
        stock: 5,
        image: 'https://5.imimg.com/data5/BH/EF/MY-21828081/bosch-professional-rotary-hammer-500x500.png',
        description: ['SDS-plus Bosch rotary hammer for concrete drilling and chiseling.']
    },
    {
        seller_id: 'S-MADINA-FSD',
        name: 'Dewalt 20V Max Cordless Drill',
        category: 'Tools',
        price: 32000,
        stock: 15,
        image: 'https://img.freepik.com/premium-photo/cordless-drill-isolated-white-background_461160-4390.jpg',
        description: ['Professional grade cordless drill. Includes 2 batteries and charger.', 'High torque output.']
    },
    {
        seller_id: 'S-MADINA-FSD',
        name: 'Stanley 100-Piece Mechanic Tool Set',
        category: 'Tools',
        price: 24000,
        stock: 10,
        image: 'https://c8.alamy.com/comp/EGT2RB/mechanic-tools-set-isolated-on-white-background-EGT2RB.jpg',
        description: ['Comprehensive socket and wrench set in a durable carrying case.']
    },
    {
        seller_id: 'S-MADINA-FSD',
        name: 'Irwin Vise-Grip Locking Pliers Set',
        category: 'Hardware',
        price: 4500,
        stock: 50,
        image: 'https://d3gqasl9vmjfd8.cloudfront.net/df7407fb-d5d1-491d-ab6d-e7c6eed5eb26.png',
        description: ['3-piece original locking pliers set with wire cutters.']
    },

    // Lyallpur Hardware
    {
        seller_id: 'S-LYALLPUR-FSD',
        name: 'Portland Cement (50kg Bag)',
        category: 'Hardware',
        price: 1350,
        stock: 500,
        image: 'https://www.gulfnecci.com/wp-content/uploads/2023/11/GulfNecci_0015_2-scaled.jpg',
        description: ['High-quality ordinary portland cement for construction projects.']
    },
    {
        seller_id: 'S-LYALLPUR-FSD',
        name: 'Deformed Steel Rebar (Grade 60, 1 ton)',
        category: 'Hardware',
        price: 260000,
        stock: 50,
        image: 'https://moizsteel.com/wp-content/uploads/2023/12/callage-2.png',
        description: ['Premium deformed steel reinforcement bars for structural concrete.']
    },
    {
        seller_id: 'S-LYALLPUR-FSD',
        name: 'Red Clay Bricks (Per 1000)',
        category: 'Hardware',
        price: 14000,
        stock: 100,
        image: 'https://thumbs.dreamstime.com/b/stack-red-clay-bricks-white-background-three-red-clay-bricks-piled-up-isolated-white-background-clear-shadow-326350182.jpg',
        description: ['A-grade kiln-baked solid red clay bricks.']
    },
    {
        seller_id: 'S-LYALLPUR-FSD',
        name: 'Galvanized Iron Wire (10kg Roll)',
        category: 'Hardware',
        price: 3500,
        stock: 100,
        image: 'https://5.imimg.com/data5/SELLER/Default/2021/1/QT/UB/DJ/60007233/galvanized-barbed-wire-roll-500x500.jpg',
        description: ['Binding wire for rebar tying and general construction use.']
    },

    // Lahore Paint House
    {
        seller_id: 'S-PAINTS-LHE',
        name: 'Berger Weathercoat Exterior Emulsion (16L)',
        category: 'Paints',
        price: 22500,
        stock: 40,
        image: 'https://5.imimg.com/data5/SELLER/Default/2021/11/VO/CE/FS/111650856/berger-weathercoat-exterior-emulsion-1000x1000.jpg',
        description: ['Premium Berger exterior weather resistant paint.', 'Protects against rain and sun.']
    },
    {
        seller_id: 'S-PAINTS-LHE',
        name: 'Brighto Enamel High Gloss (3.6L)',
        category: 'Paints',
        price: 7200,
        stock: 80,
        image: 'https://img.drz.lazcdn.com/g/kf/S77b0b5f3ca604c9c88daeeff15acc7a6H.jpg_720x720q80.jpg',
        description: ['Brighto Enamel durable gloss finish for wood and metal surfaces.']
    },
    {
        seller_id: 'S-PAINTS-LHE',
        name: 'Master Wall Putty (20kg Bag)',
        category: 'Paints',
        price: 2100,
        stock: 200,
        image: 'https://bmindustries.org/assets/images/productwallputty.jpg',
        description: ['Smooth Master acrylic wall putty for leveling plaster surfaces before painting.']
    },
    {
        seller_id: 'S-PAINTS-LHE',
        name: 'Professional Paint Roller Kit (9-inch)',
        category: 'Tools',
        price: 1200,
        stock: 150,
        image: 'https://img.freepik.com/premium-photo/white-paint-roller-isolated-white-background_979131-4181.jpg',
        description: ['Includes roller frame, 2 microfiber covers, and a heavy-duty paint tray.']
    },

    // Badami Bagh Electricals
    {
        seller_id: 'S-ELEC-LHE',
        name: 'Pakistan Cables 3/0.29 Copper Wire',
        category: 'Electrical',
        price: 11500,
        stock: 100,
        image: 'https://thumbs.dreamstime.com/b/copper-wire-isolated-white-background-252505726.jpg',
        description: ['100% pure copper single core PVC insulated cable for house wiring.']
    },
    {
        seller_id: 'S-ELEC-LHE',
        name: 'Schneider Electric 32A Distribution Board',
        category: 'Electrical',
        price: 8500,
        stock: 30,
        image: 'https://image.shutterstock.com/shutterstock/photos/505625653/display_1500/stock-photo-hanoi-vietnam-august-view-in-electric-low-voltage-control-room-of-a-senior-building-in-505625653.jpg',
        description: ['8-way metal enclosure MCB distribution board for residential safety.']
    },
    {
        seller_id: 'S-ELEC-LHE',
        name: 'Philips 12W LED Bulbs (Pack of 6)',
        category: 'Electrical',
        price: 2400,
        stock: 200,
        image: 'https://5.imimg.com/data5/SELLER/Default/2024/6/427345481/LD/WI/QR/101587125/philips-12-watt-white-reflector-led-ceiling-cob-round-spot-light-warm-white-deco-bright-500x500.jpg',
        description: ['Energy-saving cool daylight LED bulbs. B22 bayonet cap.']
    },

    // Chenab Sanitary
    {
        seller_id: 'S-CHENAB-FSD',
        name: 'Sonex Premium Kitchen Mixer Tap',
        category: 'Plumbing',
        price: 8500,
        stock: 40,
        image: 'https://c8.alamy.com/comp/EHEPX7/mixer-tap-isolated-on-a-white-background-EHEPX7.jpg',
        description: ['Sonex deck mounted chrome finish swivel spout kitchen sink mixer.']
    },
    {
        seller_id: 'S-CHENAB-FSD',
        name: 'IFO Commode One-Piece Toilet',
        category: 'Plumbing',
        price: 38000,
        stock: 20,
        image: 'https://thumbs.dreamstime.com/z/toilet-commode-isolated-white-background-302063311.jpg',
        description: ['Elegant IFO one-piece dual flush toilet with soft close seat cover.']
    },
    {
        seller_id: 'S-CHENAB-FSD',
        name: 'Sonex Bathroom Vanity Space Unit',
        category: 'Plumbing',
        price: 35000,
        stock: 12,
        image: 'https://img.freepik.com/premium-photo/background-with-realistic-rendering-that-showcases-modern-white-vanity-unit-bathroom-va_410516-90151.jpg',
        description: ['Sonex modern wall-hung vanity cabinet with ceramic basin. Water resistant.']
    },
    {
        seller_id: 'S-CHENAB-FSD',
        name: 'PPRC Pipe 32mm (PN20) - 4 Meter Length',
        category: 'Plumbing',
        price: 850,
        stock: 300,
        image: 'https://pipesnwires.com/wp-content/uploads/2024/02/9-1.png',
        description: ['Hot and cold water compatible green PPRC pipes for plumbing networks.']
    }
];

async function seed() {
    console.log("Starting Advanced Full-Ecosystem Seeding...");
    console.log("Wiping existing product and order data...");

    // Delete existing products & orders first to avoid foreign key errors on user deletion
    console.log("Deep wiping any remaining data...");
    await supabase.from('orders').delete().neq('status', 'nonexistent');
    await supabase.from('products').delete().neq('name', 'nonexistent');
    await supabase.from('users').delete().neq('email', 'nonexistent@email.com');

    // Also delete specifically the items we are about to insert just in case
    const existingSellerIds = sellers.map(s => s.seller_id);
    const existingEmails = sellers.map(s => s.email);
    await supabase.from('products').delete().in('seller_id', existingSellerIds);
    await supabase.from('users').delete().in('email', existingEmails);

    console.log("Inserting Multi-City Sellers (Faisalabad & Lahore)...");
    const { error: sellerError } = await supabase.from('users').upsert(sellers, { onConflict: 'email' });
    if (sellerError) {
        console.error("Error inserting sellers:", sellerError);
        return;
    }

    console.log("Inserting Global Product Catalog...");
    const { error: productError } = await supabase.from('products').insert(products);
    if (productError) {
        console.error("Error inserting products:", productError);
        return;
    }

    console.log("-----------------------------------------");
    console.log("✅ Seeding Complete! BuildX Ecosystem Live.");
    console.log("-----------------------------------------");
    console.log("Use the following credentials to test Seller Dashboards:");
    sellers.forEach(s => {
        console.log(`Brand: ${s.brand_name}`);
        console.log(`Email: ${s.email}`);
        console.log(`Pass:  ${s.password}`);
        console.log(`City:  ${s.city}`);
        console.log("-----------------------------------------");
    });
}

seed();
