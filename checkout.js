let cart = JSON.parse(localStorage.getItem("cart")) || {};

const sumItems = document.getElementById("sumItems");
const sumTotal = document.getElementById("sumTotal");
const checkoutItemCount = document.getElementById("checkoutItemCount");

function openStep(step) {
    [1, 2, 3].forEach(i => {
        document.getElementById(`content${i}`).classList.remove("active");
        document.getElementById(`card${i}`).classList.remove("active");
    });

    document.getElementById(`content${step}`).classList.add("active");
    document.getElementById(`card${step}`).classList.add("active");

    if (step === 1) {
        document.getElementById("changeBtn1").style.display = "none";
        document.getElementById("summary1").style.display = "none";
    }
    if (step === 2) {
        document.getElementById("changeBtn2").style.display = "none";
        document.getElementById("summary2").style.display = "none";
    }
}

function completeStep1() {
    const name = document.getElementById("custName").value.trim();
    const addr = document.getElementById("custAddress").value.trim();
    const city = document.getElementById("custCity").value.trim();

    if (!name || !addr || !city) return alert("Please fill your shipping address completely to proceed.");

    document.getElementById("dispName").innerText = name;
    document.getElementById("dispAddress").innerText = addr;
    document.getElementById("dispCity").innerText = city;

    document.getElementById("summary1").style.display = "block";
    document.getElementById("changeBtn1").style.display = "block";
    openStep(2);
}

function selectPayment(type) {
    document.getElementById("optCOD").classList.remove("selected");
    document.getElementById("optCard").classList.remove("selected");

    if (type === 'cod') {
        document.getElementById("optCOD").classList.add("selected");
        document.getElementById("payCOD").checked = true;
    } else {
        document.getElementById("optCard").classList.add("selected");
        document.getElementById("payCard").checked = true;
    }
}

function completeStep2() {
    const payCOD = document.getElementById("payCOD").checked;
    document.getElementById("dispPayment").innerHTML = payCOD ? "<i class='bx bx-money' style='font-size:20px; color:var(--primary);'></i> Cash on Delivery" : "<i class='bx bx-credit-card-alt' style='font-size:20px; color:var(--primary);'></i> Credit/Debit Card";

    document.getElementById("summary2").style.display = "block";
    document.getElementById("changeBtn2").style.display = "block";
    openStep(3);
}

function renderCheckoutItems() {
    const itemsList = document.getElementById("checkoutItemsList");
    itemsList.innerHTML = "";

    let totalQty = 0;
    let totalPrice = 0;

    if (Object.keys(cart).length === 0) {
        itemsList.innerHTML = "<p>Cart is empty. Please add items before checking out.</p>";
        return;
    }

    Object.values(cart).forEach(item => {
        totalQty += item.qty;
        totalPrice += item.price * item.qty;

        itemsList.innerHTML += `
            <div class="review-item">
                <img src="${item.image}">
                <div>
                    <h4 style="font-size:16px; color:var(--text-dark); margin-bottom:5px;">${item.name}</h4>
                    <div style="color:var(--primary); font-weight:800; font-size:16px;">PKR ${item.price.toLocaleString()}</div>
                    <div style="font-size:13px; color:var(--text-muted); margin-top:5px;">Qty: ${item.qty}</div>
                </div>
            </div>
        `;
    });

    checkoutItemCount.innerText = totalQty;
    sumItems.innerText = "PKR " + totalPrice.toLocaleString();
    sumTotal.innerText = "PKR " + totalPrice.toLocaleString();
}

async function placeOrder() {
    const name = document.getElementById("custName").value.trim();
    const address = document.getElementById("custAddress").value.trim() + ", " + document.getElementById("custCity").value.trim();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!name || address.length < 5) {
        alert("Please complete step 1 (Shipping Address).");
        openStep(1);
        return;
    }
    if (Object.keys(cart).length === 0) return alert("Cart is empty.");

    const btn = document.querySelector('.checkout-sidebar .btn-primary');
    const ogHtml = btn.innerHTML;
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Processing...`;

    let total = Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (window.supabaseClient) {
        try {
            const res = await window.supabaseClient.from("orders").insert([{
                customer_name: name,
                customer_email: currentUser ? currentUser.email : "guest@mail.com",
                address: address,
                total: total,
                item_count: Object.keys(cart).length,
                status: "Pending",
                created_at: new Date().toISOString(),
                items: cart
            }]).select("id").single();

            if (res.error) {
                // Check if the error is due to a missing table 'orders'
                if (res.error.code === 'PGRST205' || res.error.message.includes('find the table')) {
                    console.warn("Orders table not found in Supabase. Falling back to Local Storage.");
                    throw new Error("LOCAL_FALLBACK"); // throw custom error to trigger catch block
                } else {
                    throw res.error;
                }
            }

            btn.innerHTML = `<i class='bx bx-check'></i> Order Placed!`;
            btn.style.background = "#10b981";

            setTimeout(() => {
                localStorage.removeItem("cart");
                window.location.href = "thankyou.html";
            }, 1000);

        } catch (e) {
            if (e.message === "LOCAL_FALLBACK") {
                // Perform local storage saving
                fallbackToLocalOrders(name, currentUser, address, total, btn);
            } else {
                console.error(e);
                alert("Order failed: " + e.message + "\n\nWe couldn't save this. Please try again later.");
                btn.innerHTML = ogHtml;
            }
        }
    } else {
        fallbackToLocalOrders(name, currentUser, address, total, btn);
    }
}

function fallbackToLocalOrders(name, currentUser, address, total, btn) {
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    orders.push({
        id: Date.now(),
        customerName: name,
        customerEmail: currentUser ? currentUser.email : "guest@mail.com",
        address: address,
        total: total,
        itemCount: Object.keys(cart).length,
        status: "Pending",
        date: new Date().toLocaleString(),
        items: cart
    });
    localStorage.setItem("orders", JSON.stringify(orders));

    btn.innerHTML = `<i class='bx bx-check'></i> Order Placed!`;
    btn.style.background = "#10b981";

    setTimeout(() => {
        localStorage.removeItem("cart");
        window.location.href = "thankyou.html";
    }, 1000);
}


document.addEventListener("DOMContentLoaded", () => {
    openStep(1);
    renderCheckoutItems();
});
