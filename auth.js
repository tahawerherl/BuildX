// DOM Elements
const stepEmail = document.getElementById("stepEmail");
const stepPassword = document.getElementById("stepPassword");
const signupView = document.getElementById("signupView");
const verifyView = document.getElementById("verifyView");

// Inputs
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const displayEmail = document.getElementById("displayEmail");
const brandField = document.getElementById("brandField");
const roleRadios = document.getElementsByName("roleSelect");
const roleCustomerBtn = document.getElementById("roleCustomerBtn");
const roleSellerBtn = document.getElementById("roleSellerBtn");

let currentEmail = "";
let signupData = {};

// View Toggling Functions
function hideAll() {
    [stepEmail, stepPassword, signupView].forEach(el => {
        el.style.display = "none";
        el.style.animation = "none";
    });
}

function triggerAnimation(el) {
    el.offsetHeight; // trigger reflow
    el.style.animation = "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards";
}

function showEmailStep() {
    hideAll();
    stepEmail.style.display = "block";
    triggerAnimation(stepEmail);
}

function showPasswordStep() {
    hideAll();
    stepPassword.style.display = "block";
    triggerAnimation(stepPassword);
}

function showSignup() {
    hideAll();
    signupView.style.display = "block";
    triggerAnimation(signupView);
}


function toggleBrandField() {
    let role = "customer";
    roleRadios.forEach(r => { if (r.checked) role = r.value; });

    if (role === "seller") {
        brandField.style.display = "block";
        roleSellerBtn.style.borderColor = "var(--primary)";
        roleSellerBtn.style.color = "var(--primary)";
        roleSellerBtn.style.background = "#fff4ed";

        roleCustomerBtn.style.borderColor = "#e5e7eb";
        roleCustomerBtn.style.color = "var(--text-muted)";
        roleCustomerBtn.style.background = "transparent";
    } else {
        brandField.style.display = "none";
        roleCustomerBtn.style.borderColor = "var(--primary)";
        roleCustomerBtn.style.color = "var(--primary)";
        roleCustomerBtn.style.background = "#fff4ed";

        roleSellerBtn.style.borderColor = "#e5e7eb";
        roleSellerBtn.style.color = "var(--text-muted)";
        roleSellerBtn.style.background = "transparent";
    }
}

// Check if user returned from magic link verification
async function checkHashForSession() {
    if (window.supabaseClient) {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
            const { data: { session }, error } = await window.supabaseClient.auth.getSession();
            if (session) {
                await constructUserAndRedirect(session.user);
            }
        }
    }
}

// 1. LOGIN FLOW
function continueToPassword() {
    const email = loginEmailInput.value.trim();
    if (!email) return alert("Please enter your email.");
    currentEmail = email;
    displayEmail.innerText = currentEmail;
    showPasswordStep();
}

async function handleLogin() {
    const password = loginPasswordInput.value;
    if (!password) return alert("Please enter your password.");

    if (window.supabaseClient) {
        // Show loading state on button
        const btn = document.querySelector('#stepPassword .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Signing in...`;

        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: currentEmail,
                password: password,
            });

            if (error) {
                // If email verification is still somehow enabled in dashboard, catch it
                if (error.message.includes("Email not confirmed")) {
                    console.warn("Supabase requires email confirmation, but it was disabled in the app layout. Falling back to local storage session.");
                    throw new Error("UNCONFIRMED_FALLBACK");
                }
                throw error;
            }

            await constructUserAndRedirect(data.user);
        } catch (e) {
            if (e.message !== "UNCONFIRMED_FALLBACK") {
                console.error("Supabase Login Error:", e);
            }
            btn.innerHTML = originalText;
            localLoginFallback(currentEmail, password); // fallback
        }
    } else {
        localLoginFallback(currentEmail, password);
    }
}

async function constructUserAndRedirect(authUser) {
    const email = authUser.email;
    let name = authUser.user_metadata?.name || "Customer";
    let role = authUser.user_metadata?.role || "customer";

    const users = JSON.parse(localStorage.getItem("users")) || [];
    let user = users.find(u => u.email === email);

    // If seller, get details from sellers table
    if (role === "seller") {
        try {
            const { data, error } = await window.supabaseClient
                .from("sellers")
                .select("id, brand_name, name")
                .eq("email", email)
                .maybeSingle();

            if (!error && data) {
                user = {
                    email: email,
                    name: data.name,
                    role: "seller",
                    seller_id: data.id,
                    brand_name: data.brand_name
                };
            }
        } catch (e) { console.error(e); }
    }

    if (!user) {
        user = { email: email, name: name, role: role };
    }

    localStorage.setItem("currentUser", JSON.stringify(user));
    window.location.href = user.role === "seller" ? "seller.html" : "index.html";
}

function localLoginFallback(email, password) {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        alert("Invalid email or password!");
        return;
    }
    localStorage.setItem("currentUser", JSON.stringify(user));
    window.location.href = user.role === "seller" ? "seller.html" : "index.html";
}

// 2. SIGNUP FLOW WITH EMAIL VERIFICATION
async function handleSignup() {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const brandName = document.getElementById("signupBrand").value.trim();

    let role = "customer";
    roleRadios.forEach(r => { if (r.checked) role = r.value; });

    if (!name || !email || !password) return alert("Please fill all required fields!");
    if (password.length < 6) return alert("Password must be at least 6 characters.");
    if (role === "seller" && !brandName) return alert("Sellers must enter a Brand / Store name.");

    signupData = { name, email, password, role, brandName };

    const btn = document.querySelector('#signupView .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Creating...`;

    if (window.supabaseClient) {
        try {
            // Note: Supabase options.data passes these custom variables to the auth user.
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name,
                        role: role
                    }
                }
            });

            if (error) throw error;

            // Bypass verify screen, directly try to login and save user
            await completeSignupAfterVerify();

        } catch (e) {
            console.error(e);
            alert("Signup error: " + e.message);
            btn.innerHTML = originalText;
        }
    } else {
        btn.innerHTML = originalText;
        finalizeLocalSignup(signupData);
    }
}

async function completeSignupAfterVerify() {
    const { name, email, password, role, brandName } = signupData;
    const users = JSON.parse(localStorage.getItem("users")) || [];

    let seller_id = null;
    let brand_name = brandName;

    if (role === "seller" && window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient
                .from("sellers")
                .insert([{ email, name, brand_name: brandName }])
                .select("id")
                .single();
            if (error) throw error;
            if (data) { seller_id = data.id; }
        } catch (err) {
            console.error(err);
            alert("Seller account created but database update failed.");
        }
    }

    const newUser = { name, email, password, role, seller_id, brand_name };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));

    localStorage.setItem("currentUser", JSON.stringify(newUser));
    window.location.href = role === "seller" ? "seller.html" : "index.html";
}

function finalizeLocalSignup(data) {
    const { name, email, password, role, brandName } = data;
    const users = JSON.parse(localStorage.getItem("users")) || [];
    if (users.some(u => u.email === email)) return alert("User already exists!");

    const newUser = { name, email, password, role, brand_name: brandName, seller_id: Date.now() };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    alert("Local Account created! Please login.");
    showEmailStep();
}

// Initial checks
document.addEventListener("DOMContentLoaded", () => {
    // 1. Check if user clicked an email link with a token hash
    checkHashForSession();

    // 2. Check if coming from "Sell" link
    const params = new URLSearchParams(window.location.search);
    if (params.get("sell") === "true") {
        showSignup();
        roleRadios.forEach(r => {
            if (r.value === "seller") r.checked = true;
        });
        toggleBrandField();
    } else {
        showEmailStep();
    }
});
