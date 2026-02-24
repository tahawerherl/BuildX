const cartItemsContainer = document.getElementById("cartItemsContainer");
const subTotalItems = document.getElementById("subTotalItems");
const sidebarSubtotal = document.getElementById("sidebarSubtotal");
const superTotal = document.getElementById("superTotal");

function renderCartPage() {
    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    cartItemsContainer.innerHTML = "";

    let totalItems = 0;
    let totalPrice = 0;

    if (Object.keys(cart).length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align:center; padding: 60px;">
                <i class='bx bx-shopping-bag' style="font-size:80px; color:var(--text-muted); margin-bottom:20px;"></i>
                <h2 style="font-weight:700; margin-bottom:15px;">Your Cart is Empty</h2>
                <p style="color:var(--text-muted); margin-bottom:30px;">Looks like you haven't added anything to your cart yet.</p>
                <a href='index.html' class='btn-primary' style="width:auto; padding: 12px 30px;">Start Shopping</a>
            </div>
        `;
        updateTotals(0, 0);
        return;
    }

    Object.values(cart).forEach(item => {
        totalItems += item.qty;
        totalPrice += item.price * item.qty;

        let qtyOptions = "";
        for (let i = 1; i <= Math.min(item.stock || 30, 30); i++) {
            qtyOptions += `<option value="${i}" ${i === item.qty ? 'selected' : ''}>${i}</option>`;
        }

        cartItemsContainer.innerHTML += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" onclick="window.location.href='product.html?id=${item.id}'" style="cursor:pointer;">
                
                <div class="cart-item-details">
                    <div style="display:flex; justify-content:space-between;">
                        <div class="cart-item-title" onclick="window.location.href='product.html?id=${item.id}'">${item.name}</div>
                        <div class="cart-item-price">PKR ${item.price.toLocaleString()}</div>
                    </div>
                    
                    <div style="color:#10b981; font-weight:600; font-size:14px; margin-bottom:15px;">
                        <i class='bx bx-check-shield'></i> In Stock 
                    </div>
                    
                    <div class="cart-item-actions">
                        <select class="cart-qty-select" onchange="updateItemQty(${item.id}, this.value)">
                            ${qtyOptions}
                        </select>
                        <span class="cart-action-link" onclick="deleteItem(${item.id})">
                            <i class='bx bx-trash'></i> Remove
                        </span>
                        <span class="cart-action-link">
                            <i class='bx bx-heart'></i> Save
                        </span>
                    </div>
                </div>
            </div>
        `;
    });

    updateTotals(totalItems, totalPrice);
}

function updateItemQty(id, newQty) {
    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    if (cart[id]) {
        cart[id].qty = parseInt(newQty);
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCartPage();
    }
}

function deleteItem(id) {
    let cart = JSON.parse(localStorage.getItem("cart")) || {};
    if (cart[id]) {
        delete cart[id];
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCartPage();
    }
}

function updateTotals(qty, price) {
    subTotalItems.innerText = qty;
    const formatted = "PKR " + price.toLocaleString();
    sidebarSubtotal.innerText = formatted;
    superTotal.innerText = formatted;
}

document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const navGreeting = document.getElementById("navGreeting");
    if (user && navGreeting) {
        navGreeting.innerText = user.name.split(" ")[0];
    }
    renderCartPage();
});
