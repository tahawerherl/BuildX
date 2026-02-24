// orders.js - Gen-Z UI Logic
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const ordersList = document.getElementById("ordersList");

async function loadOrders() {
    if (!currentUser) {
        window.location.href = "auth.html";
        return;
    }

    const greeting = document.getElementById("navGreeting");
    if (greeting) greeting.innerText = currentUser.name.split(" ")[0];

    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    const badge = document.getElementById("cartCountBadge");
    if (badge) badge.innerText = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);

    let orders = [];

    if (window.supabaseClient) {
        try {
            let query = window.supabaseClient.from("orders").select("*").order("id", { ascending: false });
            if (currentUser.role !== "seller") {
                query = query.eq("customer_email", currentUser.email);
            }
            const { data, error } = await query;
            if (error) throw error;
            orders = data || [];
        } catch (e) {
            console.error("Supabase load error:", e.message);
            orders = loadLocalOrders();
        }
    } else {
        orders = loadLocalOrders();
    }

    renderOrders(orders);
}

function loadLocalOrders() {
    let localOrders = JSON.parse(localStorage.getItem("orders")) || [];
    if (currentUser.role !== "seller") {
        localOrders = localOrders.filter(o => o.customerEmail === currentUser.email);
    }
    return localOrders.reverse();
}

function renderOrders(ordersData) {
    ordersList.innerHTML = "";

    if (ordersData.length === 0) {
        ordersList.innerHTML = `
            <div style="text-align:center; padding: 60px;">
                <i class='bx bx-package' style="font-size:80px; color:var(--text-muted); margin-bottom:20px;"></i>
                <h2 style="font-weight:700; margin-bottom:15px;">No Orders Yet</h2>
                <p style="color:var(--text-muted); margin-bottom:30px;">You haven't placed any orders. Start building your dream space today!</p>
                <a href='index.html' class='btn-primary' style="width:auto; padding: 12px 30px;">Shop Now</a>
            </div>
        `;
        return;
    }

    ordersData.forEach(order => {
        let orderDate = new Date(order.created_at || order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        let total = order.total.toLocaleString();

        let itemsHTML = "";
        let itemsObj = order.items || {};
        Object.values(itemsObj).forEach(item => {
            itemsHTML += `
                <div class="item-row">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="item-details">
                        <h4>${item.name}</h4>
                        <div style="font-size:14px; color:var(--text-muted);">Sold by: ${item.brand || "BuildX"}</div>
                        <div class="item-actions">
                            <button class="btn-primary" style="width: auto; padding: 8px 15px; font-size:13px;" onclick="window.location.href='product.html?id=${item.id}'">Buy it again</button>
                            <button class="btn-secondary" style="width: auto; padding: 8px 15px; font-size:13px;" onclick="window.location.href='product.html?id=${item.id}'">View Item</button>
                        </div>
                    </div>
                </div>
            `;
        });

        // Status Badge & Timeline Logic
        let progressWidth = "0%";
        let step1Class = "active";
        let step2Class = "";
        let step3Class = "";

        let s2Icon = "bx-truck";
        let s3Icon = "bx-check";

        if (order.status === "Pending") {
            progressWidth = "0%";
        } else if (order.status === "Shipped") {
            progressWidth = "50%";
            step1Class = "completed";
            step2Class = "active";
        } else if (order.status === "Delivered") {
            progressWidth = "100%";
            step1Class = "completed";
            step2Class = "completed";
            step3Class = "completed";
        }

        let trackingHTML = `
            <div class="tracking-timeline">
                <div class="tracking-progress-bar" style="width: ${progressWidth};"></div>
                
                <div class="tracking-step ${step1Class}">
                    <div class="tracking-icon"><i class='bx bx-list-check'></i></div>
                    <div class="tracking-label">Order Placed</div>
                    <div class="tracking-date">${orderDate}</div>
                </div>
                
                <div class="tracking-step ${step2Class}">
                    <div class="tracking-icon"><i class='bx ${s2Icon}'></i></div>
                    <div class="tracking-label">Shipped</div>
                </div>

                <div class="tracking-step ${step3Class}">
                    <div class="tracking-icon"><i class='bx ${s3Icon}'></i></div>
                    <div class="tracking-label">Delivered</div>
                </div>
            </div>
        `;

        // Seller Toolbar inside card
        let sellerActionsHTML = "";
        let isOwnOrder = (order.customer_email === currentUser.email) || (order.customerName === currentUser.name) || (order.customer_email === currentUser.email);
        if (currentUser.role === "seller" && !isOwnOrder) {
            sellerActionsHTML = `
                <div class="seller-toolbar">
                    <i class='bx bxs-store-alt' style="color:var(--primary); font-size:24px;"></i>
                    <strong style="font-size:14px; color:var(--text-dark);">Seller Controls:</strong>
                    <button class="btn-secondary" style="width:auto; padding:6px 12px; font-size:13px;" onclick="updateStatus(${order.id}, 'Shipped')">Mark Shipped</button>
                    <button class="btn-secondary" style="width:auto; padding:6px 12px; font-size:13px;" onclick="updateStatus(${order.id}, 'Delivered')">Mark Delivered</button>
                    <span style="font-size:13px; color:var(--text-muted); margin-left:auto;">Current: <b>${order.status}</b></span>
                </div>
            `;
        }

        ordersList.innerHTML += `
            <div class="order-card">
                <div class="order-summary-bar">
                    <div style="display:flex; gap:40px;">
                        <div class="order-stat">
                            <label>Order Placed</label>
                            <strong>${orderDate}</strong>
                        </div>
                        <div class="order-stat">
                            <label>Total</label>
                            <strong>PKR ${total}</strong>
                        </div>
                        <div class="order-stat">
                            <label>Ship To</label>
                            <strong style="color:var(--primary); cursor:pointer;">${order.customer_name || order.customerName}</strong>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:var(--text-muted); font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:3px;">Order #</div>
                        <strong style="color:var(--text-dark);">${order.id}</strong>
                    </div>
                </div>
                
                <div class="order-body" style="padding-top:10px;">
                    ${trackingHTML}
                    
                    <h3 style="font-size:16px; color:var(--text-dark); margin: 30px 0 15px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Ordered Items</h3>
                    ${itemsHTML}
                </div>
                ${sellerActionsHTML}
            </div>
        `;
    });
}

async function updateStatus(orderId, newStatus) {
    if (window.supabaseClient) {
        try {
            const { error } = await window.supabaseClient.from("orders").update({ status: newStatus }).eq("id", orderId);
            if (error) throw new Error("SUPABASE_UPDATE_ERROR");
            loadOrders();
        } catch (e) {
            console.warn("Supabase update failed, falling back to Local Storage:", e.message);
            fallbackUpdateLocalStatus(orderId, newStatus);
        }
    } else {
        fallbackUpdateLocalStatus(orderId, newStatus);
    }
}

function fallbackUpdateLocalStatus(orderId, newStatus) {
    const localOrders = JSON.parse(localStorage.getItem("orders")) || [];
    const orderIndex = localOrders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        localOrders[orderIndex].status = newStatus;
        localStorage.setItem("orders", JSON.stringify(localOrders));
        loadOrders();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadOrders();

    // Search Box Logic
    const searchInput = document.querySelector(".search-box input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const allBoxes = document.querySelectorAll(".order-card");
            allBoxes.forEach(box => {
                if (box.innerText.toLowerCase().includes(term)) {
                    box.style.display = "block";
                } else {
                    box.style.display = "none";
                }
            });
        });
    }
});
