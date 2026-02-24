// 1. Supabase ke credentials
const supabaseUrl = 'https://jbhzqsqfwkvmbucmnzaa.supabase.co';
const supabaseKey = 'sb_publishable__CAKu-3zHZQKlLf6HmxT3g_jA86nIYg';

// 2. Client create karne ka sahi tareeka
// Dhyan dein: Library load hone ke baad 'supabase' (chota s) use hota hai
const _supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 3. Isay globally accessible banayein taake seller.js isay istemal kar sakay
window.supabaseClient = _supabase;

console.log("Supabase Connection Initialized!");