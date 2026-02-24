function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "auth.html";
}

function getCurrentSeller() {
    const u = JSON.parse(localStorage.getItem("currentUser"));
    if (!u || u.role !== "seller" || !u.seller_id) return null;
    return u;
}

function switchSection(sectionId) {
    document.querySelectorAll(".seller-section").forEach(s => s.classList.remove("active"));
    document.getElementById("sec-" + sectionId).classList.add("active");

    document.querySelectorAll(".seller-nav a").forEach(a => a.classList.remove("active"));
    const navLink = document.getElementById("nav-" + sectionId);
    if (navLink) navLink.classList.add("active");
}

function switchFormTab(tabNum) {
    document.querySelectorAll(".form-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".form-content").forEach(c => c.classList.remove("active"));

    document.getElementById("tab" + tabNum + "-head").classList.add("active");
    document.getElementById("tab" + tabNum + "-content").classList.add("active");
}

function parseDescription(descText) {
    if (!descText) return [];
    return descText.split(",").map(t => t.trim()).filter(Boolean);
}

async function loadInventory() {
    const tbody = document.getElementById("productTable");
    if (!tbody) return;

    const seller = getCurrentSeller();
    if (!seller) {
        tbody.innerHTML = "<tr><td colspan='5'>Please login as a seller.</td></tr>";
        return;
    }

    let products = [];

    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient
                .from("products")
                .select("*")
                .eq("seller_id", seller.seller_id)
                .order("id", { ascending: true });

            if (error) throw error;
            products = data || [];
        } catch (err) {
            console.error("Supabase load error:", err.message);
        }
    }

    tbody.innerHTML = "";
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan='5' style="text-align:center; padding:40px; color:var(--text-muted);">You don't have any active listings.</td></tr>`;
    } else {
        products.forEach(p => {
            const availability = p.stock > 0
                ? `<span style="color:#10b981; font-weight:700;">${p.stock}</span>`
                : `<span style="color:#ef4444; font-weight:700;">Out of stock</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:15px;">
                            <img src="${p.image || ""}" alt="${p.name}" style="width:60px; height:60px; object-fit:contain; border-radius:var(--radius-sm); background:#f9fafb; padding:5px;">
                            <div>
                                <div style="color:var(--text-dark); font-weight:700; font-size:16px; margin-bottom:5px;">${p.name}</div>
                                <div style="font-size:12px; color:var(--text-muted);">SKU: BDX-${p.id}</div>
                            </div>
                        </div>
                    </td>
                    <td style="font-weight:800; color:var(--primary); font-size:16px;">PKR ${p.price.toLocaleString()}</td>
                    <td><div style="font-size:13px; background:#f3f4f6; display:inline-block; padding:3px 8px; border-radius:4px; color:var(--text-muted);">${p.category || 'Uncategorized'}</div></td>
                    <td>${availability}</td>
                    <td><span style="background:#d1fae5; color:#065f46; padding:4px 10px; border-radius:var(--radius-pill); font-size:12px; font-weight:700;">Active</span></td>
                    <td>
                        <div style="display:flex; gap:10px;">
                            <button class="btn-secondary" style="width:auto; padding:5px 12px; font-size:12px;" onclick="editProduct(${p.id})"><i class='bx bx-edit-alt'></i> Edit</button>
                            <button class="btn-secondary" style="width:auto; padding:5px 12px; font-size:12px; color:#ef4444; border-color:#fca5a5;" onclick="deleteProduct(${p.id})"><i class='bx bx-trash'></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    const totalEl = document.getElementById("metricTotalProducts");
    if (totalEl) totalEl.textContent = products.length;
}

document.addEventListener("DOMContentLoaded", () => {
    const seller = getCurrentSeller();
    if (!seller) {
        window.location.href = "auth.html";
        return;
    }

    document.getElementById("sellerBrandHeading").textContent = seller.brand_name || "My Store";

    loadInventory();

    const localOrders = JSON.parse(localStorage.getItem("orders")) || [];
    let pending = 0;
    let delivered = 0;
    let todaySales = 0;
    localOrders.forEach(o => {
        if (o.status === "Pending") pending++;
        if (o.status === "Delivered") delivered++;
        todaySales += o.total;
    });

    document.getElementById("metricPendingOrders").textContent = pending;
    document.getElementById("metricDeliveredOrders").textContent = delivered;
    document.getElementById("metricSalesToday").textContent = "PKR " + todaySales.toLocaleString();
});

async function saveProduct() {
    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value;
    const price = document.getElementById("productPrice").value;
    const stock = document.getElementById("productStock").value;
    const image = document.getElementById("productImage").value.trim();
    const description = document.getElementById("productDesc").value.trim();
    const editId = document.getElementById("editProductId").value;

    if (!name || !price || !stock || !image || !category) {
        alert("Please complete Vital Info, Offer (including Category), and Images tabs first.");
        return;
    }

    const descArray = parseDescription(description);
    const numericPrice = parseFloat(price);
    const numericStock = parseInt(stock, 10) || 0;

    if (!window.supabaseClient) {
        alert("Database connection is missing.");
        return;
    }

    const seller = getCurrentSeller();
    if (!seller) return;
    const brand = seller.brand_name || "BuildX Seller";

    const originalText = document.getElementById("addBtn").innerHTML;
    document.getElementById("addBtn").innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Publishing...`;

    try {
        const payload = {
            name,
            category,
            price: numericPrice,
            stock: numericStock,
            image,
            description: descArray,
            brand: brand
        };

        if (editId) {
            const { error } = await window.supabaseClient
                .from("products")
                .update(payload)
                .eq("id", Number(editId))
                .eq("seller_id", seller.seller_id);
            if (error) {
                if (error.message.includes("schema cache") || error.message.includes("column")) {
                    throw new Error("SCHEMA_CACHE_ERROR");
                }
                throw error;
            }
            alert("Listing updated successfully.");
        } else {
            payload.seller_id = seller.seller_id;
            const { error } = await window.supabaseClient
                .from("products")
                .insert([payload]);
            if (error) {
                if (error.message.includes("schema cache") || error.message.includes("column")) {
                    throw new Error("SCHEMA_CACHE_ERROR");
                }
                throw error;
            }
            alert("New product listing created.");
        }

        // Reset
        document.getElementById("productName").value = "";
        document.getElementById("productCategory").value = "";
        document.getElementById("productPrice").value = "";
        document.getElementById("productStock").value = "";
        document.getElementById("productImage").value = "";
        document.getElementById("productDesc").value = "";
        document.getElementById("editProductId").value = "";

        document.getElementById("addBtn").innerHTML = `<i class='bx bx-cloud-upload' style="font-size:24px;"></i> Publish Listing`;

        switchSection('inventory');
        switchFormTab(1);
        loadInventory();

    } catch (err) {
        if (err.message === "SCHEMA_CACHE_ERROR") {
            localSaveProductFallback(payload, editId);
            return;
        }

        document.getElementById("addBtn").innerHTML = originalText;
        console.error("Save error:", err.message);
        alert("Error saving: " + err.message);
    }
}

function localSaveProductFallback(payload, editId) {
    console.warn("Falling back to local storage for products due to category schema issue.");
    const products = JSON.parse(localStorage.getItem("products")) || [];
    if (editId) {
        const idx = products.findIndex(p => p.id == editId);
        if (idx > -1) {
            products[idx] = { ...products[idx], ...payload };
        }
    } else {
        payload.id = Date.now();
        products.push(payload);
    }
    localStorage.setItem("products", JSON.stringify(products));
    alert("Listing saved locally (Schema Cache fix required for Cloud).");

    // Reset Form
    document.getElementById("productName").value = "";
    document.getElementById("productCategory").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productStock").value = "";
    document.getElementById("productImage").value = "";
    document.getElementById("productDesc").value = "";
    document.getElementById("editProductId").value = "";
    document.getElementById("addBtn").innerHTML = `<i class='bx bx-cloud-upload' style="font-size:24px;"></i> Publish Listing`;

    switchSection('inventory');
    switchFormTab(1);
    loadInventory();
}

async function editProduct(id) {
    if (!window.supabaseClient) return;
    const seller = getCurrentSeller();
    if (!seller) return;

    try {
        const { data, error } = await window.supabaseClient
            .from("products")
            .select("*")
            .eq("id", id)
            .eq("seller_id", seller.seller_id)
            .single();

        if (error) throw error;
        const p = data;

        document.getElementById("productName").value = p.name || "";
        document.getElementById("productCategory").value = p.category || "";
        document.getElementById("productPrice").value = p.price || "";
        document.getElementById("productStock").value = p.stock ?? "";
        document.getElementById("productImage").value = p.image || "";
        document.getElementById("productDesc").value = Array.isArray(p.description) ? p.description.join(",\n") : "";
        document.getElementById("editProductId").value = p.id;

        document.getElementById("addBtn").innerHTML = `<i class='bx bx-cloud-upload' style="font-size:24px;"></i> Update Listing`;

        switchSection('addproduct');
        switchFormTab(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert("Load error: " + err.message);
    }
}

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;

    if (!window.supabaseClient) return;
    const seller = getCurrentSeller();
    if (!seller) return;

    try {
        const { error } = await window.supabaseClient
            .from("products")
            .delete()
            .eq("id", id)
            .eq("seller_id", seller.seller_id);

        if (error) throw error;
        loadInventory();
        alert("Listing removed.");
    } catch (err) {
        alert("Delete error: " + err.message);
    }
}
