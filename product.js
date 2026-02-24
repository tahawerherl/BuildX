/* ==========================================
   BuildX Gen-Z Product Detail Logic
   ========================================== */
const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));

const localProducts = JSON.parse(localStorage.getItem("products")) || [];
let product = localProducts.find(p => p.id === productId);
const wrapper = document.getElementById("productDetailWrapper");

async function loadProductFromSupabase() {
    if (!window.supabaseClient) {
        renderProduct();
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from("products")
            .select("*")
            .eq("id", productId)
            .maybeSingle();

        if (error) throw error;
        if (data) product = data;
    } catch (err) {
        console.error("Supabase load err:", err.message);
    } finally {
        renderProduct();
    }
}

function renderProduct() {
    if (product) {
        const bulletsHTML = product.description && product.description.length > 0
            ? product.description.map(point => `<li><i class='bx bx-check-circle'></i> <span>${point}</span></li>`).join("")
            : `<li><i class='bx bx-check-circle'></i> <span>High-quality durable material</span></li>
           <li><i class='bx bx-check-circle'></i> <span>Modern aesthetic design</span></li>
           <li><i class='bx bx-check-circle'></i> <span>Ergonomic and reliable</span></li>`;

        const instock = product.stock > 0;

        wrapper.innerHTML = `
        <div class="product-layout">
            
            <!-- LEFT: Big Image Container -->
            <div class="product-image-container">
                <div style="position:absolute; top:20px; right:20px; background:white; padding:10px; border-radius:50%; box-shadow:var(--shadow-md); cursor:pointer;">
                    <i class='bx bx-heart' style="font-size:24px; color:var(--text-muted);"></i>
                </div>
                <img src="${product.image}" id="mainProductImage" alt="${product.name}">
            </div>

            <!-- RIGHT: Clean Information -->
            <div class="product-info">
                <div class="badge">Prime Quality</div>
                <div class="prod-brand">${product.brand || "BuildX"}</div>
                <h1 class="prod-title">${product.name}</h1>
                
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                    <span style="color:#f59e0b; font-size:20px;">
                        <i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star-half'></i>
                    </span>
                    <span style="color:var(--text-muted); text-decoration:underline; cursor:pointer;" onclick="document.querySelector('.review-section').scrollIntoView({behavior:'smooth'})">4.5 (120 reviews)</span>
                </div>

                <div class="prod-price">
                    <span>PKR</span> ${product.price.toLocaleString()}
                </div>
                
                ${instock ? `<div style="color:#10b981; font-weight:700;"><i class='bx bx-store'></i> In Stock (${product.stock} left)</div>` : `<div style="color:#ef4444; font-weight:700;">Out of Stock</div>`}
                <div style="font-size:14px; color:var(--text-muted); margin-top:5px;"><i class='bx bx-time'></i> Order now for Next-Day Delivery</div>

                <!-- Action Box -->
                <div class="prod-actions">
                    ${instock ? `
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateQty(-1)">-</button>
                        <input type="text" class="qty-input" id="buyQty" value="1" readonly>
                        <button class="qty-btn" onclick="updateQty(1)">+</button>
                    </div>
                    ` : ``}

                    <button class="btn-primary" style="flex:1;" onclick="addToCartAndStay()" ${!instock ? 'disabled' : ''}>
                        <i class='bx bx-cart-add'></i> Add to Cart
                    </button>
                    <button class="btn-secondary" style="flex:1;" onclick="directBuy()" ${!instock ? 'disabled' : ''}>
                        Buy Now
                    </button>
                </div>

                <ul class="features-list">
                    ${bulletsHTML}
                </ul>
            </div>
        </div>

        <!-- Modern Reviews -->
        <div class="review-section">
            <h2 style="font-size:28px; margin-bottom:30px;">Customer Feedback</h2>
            <div class="review-grid">
                <div>
                    <div style="font-size:48px; font-weight:800; line-height:1;">4.5<span style="font-size:20px; color:var(--text-muted);">/5</span></div>
                    <div style="color:#f59e0b; font-size:20px; margin:10px 0;"><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star-half'></i></div>
                    <p style="color:var(--text-muted); margin-bottom:20px;">Based on 120 reviews</p>
                    <button class="btn-secondary">Write a Review</button>
                </div>
                <div id="reviewsList">
                    <!-- Dynamic Reviews -->
                </div>
            </div>
        </div>
    `;
        renderReviews();
    } else {
        wrapper.innerHTML = "<div style='text-align:center; padding:100px; font-size:24px;'>Product not found. <br><a href='index.html' style='font-size:16px; margin-top:20px; display:inline-block;' class='btn-primary'>Return to Store</a></div>";
    }
}

function updateQty(change) {
    const qtyInput = document.getElementById("buyQty");
    let current = parseInt(qtyInput.value) || 1;
    current += change;
    if (current < 1) current = 1;
    if (current > product.stock) {
        current = product.stock;
        alert("Maximum stock reached.");
    }
    qtyInput.value = current;
}

function renderReviews() {
    const reviewsList = document.getElementById("reviewsList");
    if (!reviewsList) return;

    // Gen-Z styling for reviews
    reviewsList.innerHTML = `
        <div style="background:#f9fafb; padding:20px; border-radius:var(--radius-md); margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="https://ui-avatars.com/api/?name=Sajid+Mehmood&background=f96302&color=fff" style="width:40px; border-radius:100px;">
                    <div>
                        <div style="font-weight:700;">Sajid Mehmood <i class='bx bxs-badge-check' style="color:#10b981;"></i></div>
                        <div style="font-size:12px; color:var(--text-muted);">2 days ago</div>
                    </div>
                </div>
                <div style="color:#f59e0b;"><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star'></i><i class='bx bxs-star'></i></div>
            </div>
            <p>Absolutely amazing product. The build quality is extremely premium and feels great in hand. Definitely recommending this to my builder friends!</p>
        </div>
    `;
}

function addToCartAndStay() {
    const qty = parseInt(document.getElementById("buyQty").value);
    if (!product || qty <= 0) return;

    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    if (!cart[product.id]) {
        cart[product.id] = { ...product, qty: qty };
    } else {
        if (cart[product.id].qty + qty <= product.stock) {
            cart[product.id].qty += qty;
        } else {
            alert("Requested quantity exceeds available stock.");
            return;
        }
    }
    localStorage.setItem("cart", JSON.stringify(cart));

    // Auto update cart badge
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
        let totalQty = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
        badge.innerText = totalQty;
        badge.style.transform = "scale(1.5)";
        setTimeout(() => badge.style.transform = "scale(1)", 200);
    }

    // Button Feedback
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class='bx bx-check'></i> Added!`;
    btn.style.background = "#10b981"; // success
    btn.style.boxShadow = "none";
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = "";
    }, 2000);
}

function directBuy() {
    const qty = parseInt(document.getElementById("buyQty").value);
    if (isNaN(qty) || qty <= 0) return alert("Please enter a valid quantity.");
    let tempCart = {};
    tempCart[product.id] = { ...product, qty: qty };
    localStorage.setItem("cart", JSON.stringify(tempCart));
    window.location.href = "checkout.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // Top Nav auth state
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const navGreeting = document.getElementById("navGreeting");
    if (user && navGreeting) {
        navGreeting.innerText = user.name.split(" ")[0];
    }

    loadProductFromSupabase();

    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
        let totalQty = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
        badge.innerText = totalQty;
    }
});
