const productGrid = document.getElementById("productGrid");

// Global product state
let products = [
    { id: 1, name: "Premium Drill 20V", price: 4500, stock: 10, image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500", brand: "BuildX Pro" },
    { id: 2, name: "Wall Paint White 5L", price: 1200, stock: 50, image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500", brand: "ColorMaster" },
    { id: 3, name: "Hammer Heavy Duty", price: 800, stock: 25, image: "https://static.vecteezy.com/system/resources/previews/000/528/739/original/hammer-vector-icon.jpg", brand: "BuildX Base" },
    { id: 4, name: "ToolKit 50 Pcs", price: 5500, stock: 5, image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500", brand: "FixIt All" },
    { id: 5, name: "Extension Board 5M", price: 600, stock: 100, image: "https://images.unsplash.com/photo-1558442074-3c19857bc1dc?w=500", brand: "ElecPro" }
];

// Fallback logic
let lastLoadedData = [];

async function loadProductsFromSupabase() {
    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient.from("products").select("*");
            if (error) throw error;
            if (data && data.length > 0) {
                products = data;
                localStorage.setItem("products", JSON.stringify(products));
            } else {
                seedProducts();
            }
        } catch (e) {
            console.error("Supabase load error:", e.message);
            products = JSON.parse(localStorage.getItem("products")) || products;
        }
    } else {
        products = JSON.parse(localStorage.getItem("products")) || products;
    }
    lastLoadedData = products;
    renderProducts(lastLoadedData);
}

function renderProducts(data) {
    if (!productGrid) return;
    productGrid.innerHTML = "";

    if (data.length === 0) {
        productGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;">No products found.</div>`;
        return;
    }

    data.forEach(p => {
        productGrid.innerHTML += `
            <div class="product-card" onclick="window.location.href='product.html?id=${p.id}'">
                <img src="${p.image}" alt="${p.name}" class="product-img">
                <div class="product-brand">${p.brand || 'BuildX'}</div>
                <div class="product-title">${p.name}</div>
                <div class="product-price">PKR ${p.price.toLocaleString()}</div>
                
                <div class="add-btn">
                    <button class="btn-primary" onclick="event.stopPropagation(); addToCartFromGrid(${p.id})">
                        <i class='bx bx-cart-add'></i> Quick Add
                    </button>
                </div>
            </div>
        `;
    });
}

function filterProducts(query) {
    const q = query.toLowerCase();
    const filtered = lastLoadedData.filter(p => p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q)));
    renderProducts(filtered);
}

function addToCartFromGrid(id) {
    const p = lastLoadedData.find(item => item.id === id);
    if (!p) return;

    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    if (!cart[p.id]) {
        cart[p.id] = { ...p, qty: 1 };
    } else {
        if (cart[p.id].qty < p.stock) {
            cart[p.id].qty += 1;
        } else {
            alert("Requested quantity exceeds available stock.");
            return;
        }
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();

    // Smooth interaction feedback
    const btn = event.currentTarget;
    const ogHtml = btn.innerHTML;
    btn.innerHTML = `<i class='bx bx-check'></i> Added`;
    btn.style.background = "#10b981"; // success green
    btn.style.boxShadow = "none";
    setTimeout(() => {
        btn.innerHTML = ogHtml;
        btn.style.background = "";
    }, 1500);
}

function updateCartBadge() {
    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
        let totalQty = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
        badge.innerText = totalQty;
        // Bounce animation on update
        badge.style.transform = "scale(1.5)";
        setTimeout(() => badge.style.transform = "scale(1)", 200);
    }
}

async function seedProducts() {
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from("products").insert(products.map(p => {
                const copy = { ...p };
                delete copy.id;
                return copy;
            }));
            loadProductsFromSupabase();
        } catch (e) { console.error("Seeding failed", e); }
    }
}

// Global initialization
document.addEventListener("DOMContentLoaded", () => {
    // Top Nav auth state
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const navGreeting = document.getElementById("navGreeting");
    if (user && navGreeting) {
        navGreeting.innerText = user.name.split(" ")[0];
    }

    if (productGrid) {
        loadProductsFromSupabase();
    }

    updateCartBadge();

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => filterProducts(e.target.value));
    }
});