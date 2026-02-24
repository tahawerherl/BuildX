import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const SellerDashboard = () => {
    const { currentUser, setCurrentUser, logout } = useAuth();
    const [activeView, setActiveView] = useState('overview'); // overview, inventory, orders, addproduct
    const [activeFormTab, setActiveFormTab] = useState(1);
    const [products, setProducts] = useState([]);
    const [sellerOrders, setSellerOrders] = useState([]);
    const [activeOrderTab, setActiveOrderTab] = useState('New Orders');
    const [metrics, setMetrics] = useState({ pending: 0, delivered: 0, sales: 0, orderCount: 0 });
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const fileInputRef = useRef(null);

    // Support State
    const [chatMessages, setChatMessages] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [replyText, setReplyText] = useState('');

    const [reviewFilter, setReviewFilter] = useState('All');
    const [reviewsList, setReviewsList] = useState([]);

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        brand_name: currentUser?.brand_name || '',
        name: currentUser?.name || '',
        phone: currentUser?.phone || ''
    });

    const [financeForm, setFinanceForm] = useState({
        bank_account: currentUser?.bank_account || '',
        cnic: currentUser?.cnic || ''
    });

    useEffect(() => {
        if (currentUser) {
            setFinanceForm({
                bank_account: currentUser.bank_account || '',
                cnic: currentUser.cnic || ''
            });
            setProfileForm({
                brand_name: currentUser.brand_name || '',
                name: currentUser.name || '',
                phone: currentUser.phone || ''
            });
        }
    }, [currentUser]);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            if (currentUser?.email) {
                const { error } = await supabase.from('users').update({
                    brand_name: profileForm.brand_name,
                    name: profileForm.name
                }).eq('email', currentUser.email);

                if (error) throw error;
            }
            // Update local state
            const updatedUser = { ...currentUser, ...profileForm };
            setCurrentUser(updatedUser);
            setIsEditingProfile(false);
            toast.success('Business Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            toast.error('Failed to update profile: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFinances = async () => {
        setLoading(true);
        try {
            if (currentUser?.email) {
                const { error } = await supabase.from('users').update({
                    bank_account: financeForm.bank_account,
                    cnic: financeForm.cnic
                }).eq('email', currentUser.email);

                if (error) throw error;
            }
            const updatedUser = { ...currentUser, ...financeForm };
            setCurrentUser(updatedUser);
            toast.success('Financial details updated successfully!');
        } catch (err) {
            console.error('Error updating finances:', err);
            toast.error('Failed to update finances: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Form State
    const [form, setForm] = useState({
        id: '', name: '', category: '', price: '', stock: '', image: '', image2: '', image3: '', description: ''
    });

    const [sellerCancelModal, setSellerCancelModal] = useState({ show: false, orderId: null, reason: '' });

    const calculateNetPayout = (totalSalesAmount, orderCount) => {
        const platformCommission = totalSalesAmount * 0.10; // 10% Fee
        const fixedFee = (orderCount || 0) * 20; // Rs 20 per order
        return totalSalesAmount - platformCommission - fixedFee;
    };

    const loadInventory = async () => {
        setLoading(true);
        let loadedProducts = [];
        if (currentUser?.seller_id) {
            try {
                const { data, error } = await supabase.from('products').select('*').eq('seller_id', currentUser.seller_id).order('id', { ascending: true });
                if (error) throw error;
                loadedProducts = data || [];
                setProducts(loadedProducts);
            } catch (err) {
                console.error("Supabase load error:", err.message);
            }
        }

        try {
            const { data: remoteOrders, error: orderError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            if (orderError) throw orderError;

            let pending = 0; let delivered = 0; let todaySales = 0; let cancellationRequests = 0;
            const relevantOrders = [];

            (remoteOrders || []).forEach(o => {
                const itemsObj = o.items || {};
                let hasSellerProduct = false;
                let orderTotalForSeller = 0;

                Object.values(itemsObj).forEach(item => {
                    if (loadedProducts && loadedProducts.some(p => p.name === item.name)) {
                        hasSellerProduct = true;
                        orderTotalForSeller += (item.price * item.quantity);
                    }
                });

                if (hasSellerProduct) {
                    const sellerSpecificOrder = { ...o, total: orderTotalForSeller };
                    relevantOrders.push(sellerSpecificOrder);
                    if (o.status === "Pending") pending++;
                    if (o.status === "Delivered") delivered++;
                    if (o.status === "Cancellation Requested") cancellationRequests++;

                    if (o.status !== "Cancelled" && o.status !== "Cancellation Requested" && o.status !== "Cancelled by Seller") {
                        todaySales += orderTotalForSeller;
                    }
                }
            });

            setSellerOrders(relevantOrders);
            setMetrics({ pending, delivered, sales: todaySales, orderCount: relevantOrders.length, cancellationRequests });
        } catch (err) {
            console.error("Error loading orders from Supabase:", err);
        }

        setLoading(false);
    };

    const submitSellerCancelRequest = async () => {
        const { orderId, reason } = sellerCancelModal;
        if (!reason) return alert("Please select a reason for cancellation.");

        setLoading(true);
        try {
            const { error } = await supabase
                .from("orders")
                .update({ status: 'Cancelled by Seller', cancelReason: reason, cancelBy: 'seller' })
                .eq("id", orderId);

            if (error) throw error;

            setSellerCancelModal({ show: false, orderId: null, reason: '' });
            alert("Order Cancelled by Seller successfully.");
            loadInventory();
        } catch (err) {
            console.error("Cancel err", err);
            alert("Failed to cancel order.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();

        const channel = supabase.channel('seller-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                loadInventory();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const handleFormChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleImageUpload = (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(p => ({ ...p, [fieldName]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price || !form.stock || !form.image || !form.category) {
            return toast.error("Please complete Vital Info, Offer (including Category), and Images tabs first.");
        }

        const descArray = form.description ? form.description.split("\n").map(t => t.trim()).filter(Boolean) : [];
        const payload = {
            name: form.name,
            category: form.category,
            price: parseFloat(form.price),
            stock: parseInt(form.stock, 10),
            image: form.image,
            image2: form.image2 || null,
            image3: form.image3 || null,
            description: descArray,
            seller_id: currentUser?.seller_id
        };

        setLoading(true);
        try {
            if (form.id) {
                const { error } = await supabase.from('products').update(payload).eq('id', Number(form.id)).eq('seller_id', currentUser.seller_id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').insert([payload]);
                if (error) throw error;
            }

            toast.success(form.id ? "Listing updated successfully." : "New product listing created.");
            resetForm();

        } catch (err) {
            console.error("Save product error:", err);
            toast.error("Error saving: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ id: '', name: '', category: '', price: '', stock: '', image: '', image2: '', image3: '', description: '' });
        setActiveView('inventory');
        setActiveFormTab(1);
        loadInventory();
    };

    const editProduct = async (id) => {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('id', id).eq('seller_id', currentUser.seller_id).single();
            if (error) throw error;
            setForm({
                id: data.id, sku: data.sku || '', name: data.name || '', category: data.category || '', price: data.price || '',
                stock: data.stock ?? '', image: data.image || '', image2: data.image2 || '', image3: data.image3 || '', description: Array.isArray(data.description) ? data.description.join("\n") : ""
            });
            setActiveView('addproduct');
            setActiveFormTab(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            toast.error("Load error: " + err.message);
        }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this listing?")) return;
        try {
            const { error } = await supabase.from("products").delete().eq("id", id).eq("seller_id", currentUser.seller_id);
            if (error) throw error;
            loadInventory();
            toast.success("Listing removed.");
        } catch (err) {
            toast.error("Delete error: " + err.message);
        }
    };

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) throw error;

            toast.success(`Order status updated to ${newStatus}`);
            loadInventory();
        } catch (err) {
            console.error("Failed to sync order status to cloud:", err);
            toast.error("Failed to update order status.");
        }
    };

    const toggleStockStatus = async (product) => {
        const newStock = product.stock > 0 ? 0 : 10; // Simple toggle between 0 and 10 for demo

        try {
            const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', product.id).eq('seller_id', currentUser.seller_id);
            if (error) throw error;
        } catch (e) {
            console.warn("Could not sync stock toggle to cloud", e);
            toast.error("Failed to update stock status.");
        }

        loadInventory();
    };

    // --- PHASE 9 UTILITIES ---
    const handleExportOrders = () => {
        const filteredOrders = sellerOrders.filter(order => {
            if (activeOrderTab === 'New Orders') return order.status === 'Pending';
            if (activeOrderTab === 'Picking/Packing') return order.status === 'Packing';
            if (activeOrderTab === 'Shipped') return order.status === 'Shipped';
            if (activeOrderTab === 'Delivered') return order.status === 'Delivered';
            if (activeOrderTab === 'Returns') return order.status === 'Returned' || order.status === 'Returns';
            if (activeOrderTab === 'Cancelled') return order.status === 'Cancelled';
            return true;
        });

        if (!filteredOrders.length) return toast.error(`No orders in ${activeOrderTab} to export.`);

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Order ID,Date,Customer,Status,Items\n";

        filteredOrders.forEach(o => {
            const items = Object.values(o.items || {}).map(i => `${i.name} (Qty:${i.quantity})`).join("; ");
            const row = `${o.id},${o.created_at || o.date},${o.customer_email || 'Guest'},${o.status},"${items}"`;
            csvContent += row + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `orders_export_${activeOrderTab.replace(/[\/ ]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintSlips = () => {
        const filteredOrders = sellerOrders.filter(order => {
            if (activeOrderTab === 'New Orders') return order.status === 'Pending';
            if (activeOrderTab === 'Picking/Packing') return order.status === 'Packing';
            if (activeOrderTab === 'Shipped') return order.status === 'Shipped';
            if (activeOrderTab === 'Delivered') return order.status === 'Delivered';
            if (activeOrderTab === 'Returns') return order.status === 'Returned' || order.status === 'Returns';
            if (activeOrderTab === 'Cancelled') return order.status === 'Cancelled';
            return true;
        });

        if (!filteredOrders.length) return alert(`No orders in ${activeOrderTab} to print.`);
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write('<html><head><title>Packing Slips</title><style>body{font-family:sans-serif;padding:20px;} .slip{border:1px solid #ccc;padding:20px;margin-bottom:20px;page-break-after:always;}</style></head><body>');
        printWindow.document.write(`<h2>${activeOrderTab} Packing Slips</h2>`);
        filteredOrders.forEach(o => {
            const items = Object.values(o.items || {}).map(i => `<li>${i.name} - Qty: ${i.quantity}</li>`).join("");
            printWindow.document.write(`<div class="slip"><h3>Order #${o.id.slice(0, 8)}</h3><p><strong>Customer:</strong> ${o.customer_email || 'Guest'}</p><p><strong>Status:</strong> ${o.status}</p><h4>Items:</h4><ul>${items}</ul></div>`);
        });
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,name,category,price,stock,description_bullets,image_main,image_2,image_3\nExample Drill,Power Tools,4500,50,\"Feature 1, Feature 2\",https://example.com/img1.png,,";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "buildx_inventory_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUploadChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split("\n");
            if (lines.length < 2) return toast.error("Invalid CSV format or empty file.");

            const uploadPayloads = [];

            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(",");
                if (row.length < 6 || !row[1]) continue; // Title is required

                uploadPayloads.push({
                    name: row[1],
                    category: row[2] || 'Uncategorized',
                    price: parseFloat(row[3]) || 0,
                    stock: parseInt(row[4], 10) || 0,
                    description: row[5] ? row[5].replace(/"/g, '').split(";").map(s => s.trim()) : [],
                    image: row[6] || '',
                    image2: row[7] || null,
                    image3: row[8] || null,
                    seller_id: currentUser?.seller_id
                });
            }

            if (uploadPayloads.length === 0) {
                return toast.error("No valid products found in CSV.");
            }

            setLoading(true);
            try {
                const { error } = await supabase.from('products').insert(uploadPayloads);
                if (error) throw error;

                toast.success(`Successfully imported ${uploadPayloads.length} products to your cloud inventory.`);
                loadInventory();
            } catch (err) {
                console.error("Bulk upload error:", err);
                toast.error("Failed to import products: " + err.message);
            } finally {
                setLoading(false);
                e.target.value = null; // reset
            }
        };
        reader.readAsText(file);
    };

    const handleSendChatReply = () => {
        if (!replyText.trim()) return;
        setChatMessages(prev => prev.map(chat => {
            if (chat.id === activeChatId) {
                return { ...chat, replies: [...chat.replies, { text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] };
            }
            return chat;
        }));
        setReplyText('');
    };

    return (
        <div className="dashboard-container">
            {/* Dark Amazon-Style Sidebar */}
            <div className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: '25px 20px', borderBottom: '1px solid #334155' }}>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <i className='bx bxs-store-alt' style={{ color: '#f97316', fontSize: '24px' }}></i>
                        {currentUser?.brand_name || 'My Store'}
                    </div>
                    <div style={{ fontSize: '12px', background: '#334155', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>Seller Central ID: {currentUser?.seller_id?.toString().slice(-6) || 'N/A'}</div>
                </div>

                <nav style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginBottom: '10px' }}>Dashboard</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'overview' ? '#fff' : '#cbd5e1', background: activeView === 'overview' ? '#f97316' : 'transparent', fontWeight: activeView === 'overview' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('overview'); }}>
                        <i className='bx bx-bar-chart-alt-2' style={{ fontSize: '20px', color: activeView === 'overview' ? '#fff' : 'inherit' }}></i> Overview
                    </a>

                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginTop: '20px', marginBottom: '10px' }}>Logistics</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'orders' ? '#fff' : '#cbd5e1', background: activeView === 'orders' ? '#f97316' : 'transparent', fontWeight: activeView === 'orders' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('orders'); }}>
                        <i className='bx bx-package' style={{ fontSize: '20px', color: activeView === 'orders' ? '#fff' : 'inherit' }}></i> Order Fulfillment
                        {metrics.pending > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '20px', marginLeft: 'auto', fontWeight: 700 }}>{metrics.pending}</span>}
                    </a>

                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginTop: '20px', marginBottom: '10px' }}>Catalog</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'inventory' ? '#fff' : '#cbd5e1', background: activeView === 'inventory' ? '#f97316' : 'transparent', fontWeight: activeView === 'inventory' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('inventory'); }}>
                        <i className='bx bx-list-ul' style={{ fontSize: '20px', color: activeView === 'inventory' ? '#fff' : 'inherit' }}></i> Manage Inventory
                    </a>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'addproduct' ? '#fff' : '#cbd5e1', background: activeView === 'addproduct' ? '#f97316' : 'transparent', fontWeight: activeView === 'addproduct' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('addproduct'); }}>
                        <i className='bx bx-plus-circle' style={{ fontSize: '20px', color: activeView === 'addproduct' ? '#fff' : 'inherit' }}></i> Add Product
                    </a>

                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginTop: '20px', marginBottom: '10px' }}>Support & Operations</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'finances' ? '#fff' : '#cbd5e1', background: activeView === 'finances' ? '#f97316' : 'transparent', fontWeight: activeView === 'finances' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('finances'); }}>
                        <i className='bx bx-wallet-alt' style={{ fontSize: '20px', color: activeView === 'finances' ? '#fff' : 'inherit' }}></i> Finances
                    </a>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'messages' ? '#fff' : '#cbd5e1', background: activeView === 'messages' ? '#f97316' : 'transparent', fontWeight: activeView === 'messages' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('messages'); }}>
                        <i className='bx bx-message-square-detail' style={{ fontSize: '20px', color: activeView === 'messages' ? '#fff' : 'inherit' }}></i> Buyer Messages
                    </a>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'reviews' ? '#fff' : '#cbd5e1', background: activeView === 'reviews' ? '#f97316' : 'transparent', fontWeight: activeView === 'reviews' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('reviews'); }}>
                        <i className='bx bx-star' style={{ fontSize: '20px', color: activeView === 'reviews' ? '#fff' : 'inherit' }}></i> Reviews
                    </a>

                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginTop: '20px', marginBottom: '10px' }}>Settings</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'profile' ? '#fff' : '#cbd5e1', background: activeView === 'profile' ? '#f97316' : 'transparent', fontWeight: activeView === 'profile' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('profile'); }}>
                        <i className='bx bx-user-circle' style={{ fontSize: '20px', color: activeView === 'profile' ? '#fff' : 'inherit' }}></i> Seller Profile
                    </a>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: 500, transition: 'all 0.2s', marginTop: '10px' }} onClick={(e) => { e.preventDefault(); logout(); }}>
                        <i className='bx bx-log-out'></i> Logout Account
                    </a>
                </nav>
            </div>

            {/* Mobile Overlay */}
            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

            {/* Main Content Area */}
            <div className="dashboard-main">
                <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                    <i className='bx bx-menu'></i>
                </button>
                {activeView === 'overview' && (
                    <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Seller Central Hub</h2>
                                <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Welcome back, track your business performance here.</p>
                            </div>
                            <div style={{ textAlign: 'right', background: '#f8fafc', padding: '15px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                    <i className='bx bx-wallet' style={{ fontSize: '18px', color: '#3b82f6' }}></i> Earnings Wallet
                                </div>
                                <div style={{ fontSize: '28px', color: '#10b981', fontWeight: 800, margin: '5px 0' }}>PKR {calculateNetPayout(metrics.sales).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Gross Sales: PKR {metrics.sales.toLocaleString()} <span style={{ color: '#ef4444' }}>(-10% Fee)</span></div>
                            </div>
                        </div>

                        <div className="dashboard-grid">
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', color: '#4b5563', fontWeight: 600 }}>Active Listings</h3>
                                    <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px', borderRadius: '8px' }}><i className='bx bx-layer' style={{ fontSize: '20px' }}></i></div>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827' }}>{products.length}</div>
                            </div>

                            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', color: '#4b5563', fontWeight: 600 }}>Pending Orders</h3>
                                    <div style={{ background: '#fef3c7', color: '#f59e0b', padding: '8px', borderRadius: '8px' }}><i className='bx bx-time-five' style={{ fontSize: '20px' }}></i></div>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827' }}>{metrics.pending}</div>
                            </div>

                            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', color: '#4b5563', fontWeight: 600 }}>Completed Shipments</h3>
                                    <div style={{ background: '#d1fae5', color: '#10b981', padding: '8px', borderRadius: '8px' }}><i className='bx bx-check-double' style={{ fontSize: '20px' }}></i></div>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827' }}>{metrics.delivered}</div>
                            </div>

                            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', color: '#4b5563', fontWeight: 600 }}>Conversion Rate</h3>
                                    <div style={{ background: '#ede9fe', color: '#8b5cf6', padding: '8px', borderRadius: '8px' }}><i className='bx bx-line-chart' style={{ fontSize: '20px' }}></i></div>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827' }}>0.0%</div>
                            </div>
                        </div>

                        {/* Earnings Graph Mock */}
                        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Weekly Sales Growth</h3>
                                <select style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', fontWeight: 600, color: '#475569' }}>
                                    <option>This Week</option>
                                    <option>Last 30 Days</option>
                                </select>
                            </div>
                            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '15px', padding: '0 20px', borderBottom: '2px solid #f1f5f9', position: 'relative' }}>
                                {/* Y-Axis grid lines */}
                                <div style={{ position: 'absolute', width: '100%', borderTop: '1px dashed #e2e8f0', bottom: '50px', zIndex: 0 }}></div>
                                <div style={{ position: 'absolute', width: '100%', borderTop: '1px dashed #e2e8f0', bottom: '100px', zIndex: 0 }}></div>
                                <div style={{ position: 'absolute', width: '100%', borderTop: '1px dashed #e2e8f0', bottom: '150px', zIndex: 0 }}></div>

                                {/* Bars */}
                                <div style={{ flex: 1, background: '#bae6fd', height: '0%', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 1, transition: 'height 1s ease-out' }}></div>
                                <div style={{ flex: 1, background: '#7dd3fc', height: '0%', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 1, transition: 'height 1s ease-out' }}></div>
                                <div style={{ flex: 1, background: '#38bdf8', height: '0%', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 1, transition: 'height 1s ease-out' }}></div>
                                <div style={{ flex: 1, background: '#0ea5e9', height: '0%', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 1, transition: 'height 1s ease-out' }}></div>
                                <div style={{ flex: 1, background: '#0284c7', height: '0%', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 1, transition: 'height 1s ease-out' }}></div>
                                <div style={{ flex: 1, background: '#0369a1', height: '0%', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 1, transition: 'height 1s ease-out' }}></div>
                                <div style={{ flex: 1, background: '#f97316', height: '0%', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 1, boxShadow: 'none', transition: 'height 1s ease-out' }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px 0 20px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span style={{ color: '#f97316' }}>Sun</span>
                            </div>
                        </div>

                        {/* Walmart-Style Account Health & Feedback Grid */}
                        <div className="dashboard-grid">
                            {/* Account Health (Walmart Style) */}
                            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                <div style={{ padding: '20px 25px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Account Health</h3>
                                    <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Excellent</span>
                                </div>
                                <div className="responsive-grid-3" style={{ padding: '25px', textAlign: 'center' }}>
                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>0.0%</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>Order Defect Rate</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Target: &lt; 2%</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>N/A</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>On-Time Delivery</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Target: &gt; 95%</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>N/A</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>Valid Tracking</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Target: &gt; 99%</div>
                                    </div>
                                </div>
                                <div style={{ padding: '0 25px 25px 25px' }}>
                                    {metrics.pending > 0 ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 15px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <i className='bx bxs-error-circle' style={{ color: '#d97706', fontSize: '20px' }}></i>
                                                <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>Action Required: {metrics.pending} pending orders</div>
                                            </div>
                                            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }} onClick={() => setActiveView('orders')}>Fulfill</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 15px', borderRadius: '8px' }}>
                                            <i className='bx bx-check-shield' style={{ color: '#16a34a', fontSize: '20px' }}></i>
                                            <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>Account is in perfect standing. Minimum compliance met.</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Customer Feedback */}
                            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px 25px', borderBottom: '1px solid #f3f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Customer Feedback</h3>
                                </div>
                                <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                        <div style={{ fontSize: '36px', fontWeight: 800, color: '#111827' }}>0.0</div>
                                        <div>
                                            <div style={{ color: '#eab308', fontSize: '18px', letterSpacing: '2px' }}>
                                                <i className='bx bx-star'></i><i className='bx bx-star'></i><i className='bx bx-star'></i><i className='bx bx-star'></i><i className='bx bx-star'></i>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>(0 Ratings)</div>
                                        </div>
                                    </div>
                                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '15px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', fontStyle: 'italic', marginBottom: '4px' }}>No reviews received yet.</div>
                                    </div>
                                    <button style={{ marginTop: 'auto', background: 'transparent', border: '1px solid #e2e8f0', color: '#475569', padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background = '#f8fafc'} onMouseOut={e => e.target.style.background = 'transparent'}>View All Reviews</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'inventory' && (
                    <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Inventory Manager</h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-secondary" style={{ padding: '10px 15px', fontSize: '14px', borderRadius: '8px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => handleDownloadTemplate()}>
                                    <i className='bx bx-download'></i> CSV Template
                                </button>
                                <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUploadChange} />
                                <button style={{ padding: '10px 15px', fontSize: '14px', borderRadius: '8px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => fileInputRef.current?.click()}>
                                    <i className='bx bx-upload'></i> Upload CSV
                                </button>
                                <button className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { resetForm(); setActiveView('addproduct'); }}><i className='bx bx-plus'></i> New Listing</button>
                            </div>
                        </div>

                        {/* Stock Alerts Panel */}
                        {products.filter(p => p.stock <= 5).length > 0 && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <i className='bx bx-error' style={{ color: '#d97706', fontSize: '28px' }}></i>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, color: '#92400e', fontSize: '16px', marginBottom: '8px' }}>Low Stock Alert</h3>
                                    <p style={{ margin: 0, color: '#b45309', fontSize: '14px', marginBottom: '15px' }}>{products.filter(p => p.stock <= 5).length} items in your catalog have critically low stock and risk being delisted from the marketplace.</p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {products.filter(p => p.stock <= 5).slice(0, 3).map(p => (
                                            <div key={p.id} style={{ background: '#fff', border: '1px solid #fde68a', padding: '10px 15px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name}
                                                <span style={{ color: '#ef4444' }}>({p.stock} left)</span>
                                                <button style={{ background: '#f97316', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setActiveView('addproduct')}>Reorder</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            <div className="table-responsive" style={{ margin: 0 }}>
                                <table className="seller-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Product</th>
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Price</th>
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Category</th>
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Available</th>
                                            <th style={{ padding: '15px 20px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ padding: '15px 20px', textAlign: 'right', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}><i className='bx bx-loader-alt bx-spin' style={{ fontSize: '30px', color: '#3b82f6' }}></i></td></tr>
                                        ) : products.length === 0 ? (
                                            <tr><td colSpan='6' style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
                                                <i className='bx bx-box' style={{ fontSize: '60px', color: '#cbd5e1', marginBottom: '15px' }}></i>
                                                <div style={{ fontSize: '16px', fontWeight: 600 }}>No Active Listings</div>
                                                <div style={{ fontSize: '14px', marginTop: '5px' }}>Add products to your catalog to start selling.</div>
                                            </td></tr>
                                        ) : (
                                            products.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '15px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                            <img src={p.image || ""} alt={p.name} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px' }} />
                                                            <div>
                                                                <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{p.name}</div>
                                                                <div style={{ fontSize: '12px', color: '#64748b' }}>SKU: BDX-{p.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '15px 20px', fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>PKR {p.price?.toLocaleString()}</td>
                                                    <td style={{ padding: '15px 20px' }}><div style={{ fontSize: '12px', background: '#f1f5f9', display: 'inline-block', padding: '4px 10px', borderRadius: '6px', color: '#475569', fontWeight: 600 }}>{p.category || 'Uncategorized'}</div></td>
                                                    <td style={{ padding: '15px 20px' }}>{p.stock > 0 ? <span style={{ color: '#10b981', fontWeight: 700 }}>{p.stock} Units</span> : <span style={{ color: '#ef4444', fontWeight: 700 }}>Out of stock</span>}</td>
                                                    <td style={{ padding: '15px 20px' }}>{p.stock > 0 ? <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Active</span> : <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Inactive</span>}</td>
                                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                className="btn-secondary"
                                                                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', background: p.stock > 0 ? '#fff' : '#fef2f2', borderColor: p.stock > 0 ? '#e2e8f0' : '#fca5a5', color: p.stock > 0 ? '#475569' : '#ef4444' }}
                                                                onClick={() => toggleStockStatus(p)}
                                                                title={p.stock > 0 ? "Mark as Out of Stock" : "Restock"}
                                                            >
                                                                <i className={p.stock > 0 ? 'bx bx-x-circle' : 'bx bx-check-circle'}></i> {p.stock > 0 ? 'OOS' : 'Restock'}
                                                            </button>
                                                            <button style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer' }} onClick={() => editProduct(p.id)}><i className='bx bx-edit-alt'></i> Edit</button>
                                                            <button style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer' }} onClick={() => deleteProduct(p.id)}><i className='bx bx-trash'></i></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'orders' && (
                    <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Order Logistics Hub</h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-secondary" style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '6px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={handlePrintSlips}><i className='bx bx-printer'></i> Print Packing Slips</button>
                                <button className="btn-primary" style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }} onClick={handleExportOrders}><i className='bx bx-download'></i> Export Orders</button>
                            </div>
                        </div>

                        {/* Walmart-Style Order Pipeline Tabs */}
                        <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '5px', overflowX: 'auto', gap: '5px' }}>
                            {['New Orders', 'Picking/Packing', 'Shipped', 'Delivered', 'Cancellation Requests', 'Returns', 'Cancelled'].map(tab => (
                                <button key={tab} style={{ flex: 1, minWidth: '130px', padding: '12px', background: activeOrderTab === tab ? '#f8fafc' : 'transparent', border: activeOrderTab === tab ? '1px solid #e2e8f0' : 'none', borderRadius: '8px', color: (activeOrderTab === tab && tab === 'Cancelled') || (activeOrderTab === tab && tab === 'Cancellation Requests') ? '#ef4444' : activeOrderTab === tab ? '#0f172a' : '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onClick={() => setActiveOrderTab(tab)}>
                                    {tab === 'Returns' && <i className='bx bx-error-circle' style={{ color: '#ef4444' }}></i>}
                                    {tab === 'Cancellation Requests' && <i className='bx bx-time-five' style={{ color: '#ea580c' }}></i>}
                                    {tab === 'Cancelled' && <i className='bx bx-x-circle' style={{ color: '#ef4444' }}></i>}
                                    {tab}
                                    {tab === 'New Orders' && metrics.pending > 0 && <span style={{ background: '#f97316', color: '#fff', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>{metrics.pending}</span>}
                                    {tab === 'Cancellation Requests' && metrics.cancellationRequests > 0 && <span style={{ background: '#ea580c', color: '#fff', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>{metrics.cancellationRequests}</span>}
                                </button>
                            ))}
                        </div>

                        {(() => {
                            const filteredOrders = sellerOrders.filter(order => {
                                if (activeOrderTab === 'New Orders') return order.status === 'Pending';
                                if (activeOrderTab === 'Picking/Packing') return order.status === 'Packing';
                                if (activeOrderTab === 'Shipped') return order.status === 'Shipped';
                                if (activeOrderTab === 'Delivered') return order.status === 'Delivered';
                                if (activeOrderTab === 'Returns') return order.status === 'Returned' || order.status === 'Returns';
                                if (activeOrderTab === 'Cancellation Requests') return order.status === 'Cancellation Requested';
                                if (activeOrderTab === 'Cancelled') return order.status === 'Cancelled' || order.status === 'Cancelled by Seller';
                                return true;
                            });

                            if (filteredOrders.length === 0) return (
                                <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <i className='bx bx-package' style={{ fontSize: '60px', color: '#cbd5e1', marginBottom: '15px' }}></i>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>No Orders in {activeOrderTab}</div>
                                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>Orders matching this status will appear here.</div>
                                </div>
                            );

                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                    {filteredOrders.map(order => {
                                        const itemsObj = order.items || {};
                                        const itemArray = Object.values(itemsObj);

                                        let statusColor = '#f59e0b';
                                        let statusBg = '#fef3c7';
                                        if (order.status === 'Shipped') { statusColor = '#3b82f6'; statusBg = '#dbeafe'; }
                                        if (order.status === 'Delivered') { statusColor = '#10b981'; statusBg = '#d1fae5'; }

                                        return (
                                            <div key={order.id} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                                <div style={{ background: '#f8fafc', padding: '15px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>PO: {order.id.slice(0, 8).toUpperCase()}</span>
                                                            <span style={{ background: statusBg, color: statusColor, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{order.status}</span>
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#64748b' }}>Placed: {new Date(order.created_at || order.date).toLocaleString()} • <span style={{ color: '#0f172a', fontWeight: 600 }}>{order.customer_email || order.customerEmail || 'Guest Account'}</span></div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        {order.status === 'Cancellation Requested' && (
                                                            <>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', marginRight: '15px' }}>
                                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Reason:</div>
                                                                    <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 600, fontStyle: 'italic' }}>"{order.cancelReason || 'Requested by Customer'}"</div>
                                                                </div>
                                                                <button
                                                                    onClick={() => { if (window.confirm('Approve Cancellation?')) handleUpdateOrderStatus(order.id, 'Cancelled'); }}
                                                                    style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '6px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                                                    onMouseOver={e => e.target.style.background = '#fef2f2'}
                                                                    onMouseOut={e => e.target.style.background = 'transparent'}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => { if (window.confirm('Decline and Ship? Status will be updated to Shipped.')) handleUpdateOrderStatus(order.id, 'Shipped'); }}
                                                                    style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                                                >
                                                                    Decline & Ship
                                                                </button>
                                                            </>
                                                        )}
                                                        {(order.status === 'Pending' || order.status === 'Packing') && (
                                                            <button
                                                                style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '6px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }}
                                                                onMouseOver={e => e.target.style.background = '#fef2f2'}
                                                                onMouseOut={e => e.target.style.background = 'transparent'}
                                                                onClick={() => setSellerCancelModal({ show: true, orderId: order.id, reason: '' })}
                                                            >
                                                                Cancel Order
                                                            </button>
                                                        )}
                                                        {order.status === 'Pending' && (
                                                            <button style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }} onClick={() => handleUpdateOrderStatus(order.id, 'Shipped')}><i className='bx bx-barcode-reader' ></i> Generate Label</button>
                                                        )}
                                                        <select style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                                            value={order.status}
                                                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}>
                                                            <option value="Pending">Pending</option>
                                                            <option value="Packing">Packing</option>
                                                            <option value="Shipped">Shipped</option>
                                                            <option value="Delivered">Delivered</option>
                                                            <option value="Returned">Returned</option>
                                                            <option value="Cancellation Requested" disabled>Cancellation Requested</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div style={{ padding: '20px 25px' }}>
                                                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#111827' }}>Items to Fulfill:</h4>
                                                    {itemArray.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            {itemArray.map((item, idx) => (
                                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '15px 20px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                        <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} />
                                                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</div>
                                                                    </div>
                                                                    <div style={{ fontSize: '14px', fontWeight: 700 }}>
                                                                        Qty: {item.quantity}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Item details unavailable for an older legacy order.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeView === 'addproduct' && (
                    <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#fff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>{form.id ? 'Edit Listing' : 'Add New Product'}</h2>
                            <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Fill out the product information below to publish it to your catalog.</p>
                        </div>

                        <div className="add-product-container" style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            <div className="add-product-nav" style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb', padding: '0 20px', display: 'flex' }}>
                                <div className={`form-tab ${activeFormTab === 1 ? 'active' : ''}`} style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: activeFormTab === 1 ? '2px solid #3b82f6' : '2px solid transparent', color: activeFormTab === 1 ? '#3b82f6' : '#6b7280', fontWeight: activeFormTab === 1 ? 600 : 500 }} onClick={() => setActiveFormTab(1)}>1. Vital Info</div>
                                <div className={`form-tab ${activeFormTab === 2 ? 'active' : ''}`} style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: activeFormTab === 2 ? '2px solid #3b82f6' : '2px solid transparent', color: activeFormTab === 2 ? '#3b82f6' : '#6b7280', fontWeight: activeFormTab === 2 ? 600 : 500 }} onClick={() => setActiveFormTab(2)}>2. Offer</div>
                                <div className={`form-tab ${activeFormTab === 3 ? 'active' : ''}`} style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: activeFormTab === 3 ? '2px solid #3b82f6' : '2px solid transparent', color: activeFormTab === 3 ? '#3b82f6' : '#6b7280', fontWeight: activeFormTab === 3 ? 600 : 500 }} onClick={() => setActiveFormTab(3)}>3. Images</div>
                                <div className={`form-tab ${activeFormTab === 4 ? 'active' : ''}`} style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: activeFormTab === 4 ? '2px solid #3b82f6' : '2px solid transparent', color: activeFormTab === 4 ? '#3b82f6' : '#6b7280', fontWeight: activeFormTab === 4 ? 600 : 500 }} onClick={() => setActiveFormTab(4)}>4. Description</div>
                            </div>
                            <div className="add-product-body" style={{ padding: '30px' }}>
                                <form onSubmit={handleSaveProduct}>
                                    {activeFormTab === 1 && (
                                        <div className="form-content active" style={{ maxWidth: '600px' }}>
                                            <h3 style={{ marginBottom: '20px', color: '#111827' }}>Vital Information</h3>
                                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                                <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Product Name <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input type="text" className="form-input" name="name" value={form.name} onChange={handleFormChange} placeholder="e.g., Premium 20V Cordless Drill" required style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' }} />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Internal SKU</label>
                                                <input type="text" className="form-input" name="sku" value={form.sku} onChange={handleFormChange} placeholder="e.g., DRIL-20V-01" style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' }} />
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>A BDX-IN will be automatically generated upon saving.</div>
                                            </div>
                                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                                                <button type="button" className="btn-primary" style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setActiveFormTab(2)}>
                                                    Next Step <i className='bx bx-right-arrow-alt'></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeFormTab === 2 && (
                                        <div className="form-content active" style={{ maxWidth: '600px' }}>
                                            <h3 style={{ marginBottom: '20px', color: '#111827' }}>Offer Details</h3>
                                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                                <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Product Category <span style={{ color: '#ef4444' }}>*</span></label>
                                                <select className="form-input" name="category" value={form.category} onChange={handleFormChange} required style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', background: '#fff' }}>
                                                    <option value="">Select a Category</option>
                                                    <option value="Power Tools">Power Tools</option>
                                                    <option value="Hand Tools">Hand Tools</option>
                                                    <option value="Building Materials">Building Materials</option>
                                                    <option value="Hardware">Hardware</option>
                                                    <option value="Paint">Paint</option>
                                                    <option value="Electrical">Electrical</option>
                                                    <option value="Plumbing">Plumbing</option>
                                                    <option value="Safety Gear">Safety Gear</option>
                                                    <option value="Lighting">Lighting</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', gap: '20px' }}>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Your Price (PKR) <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <input type="number" className="form-input" name="price" value={form.price} onChange={handleFormChange} placeholder="0.00" required style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' }} />
                                                </div>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Available Stock <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <input type="number" className="form-input" name="stock" value={form.stock} onChange={handleFormChange} placeholder="0" required style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px' }} />
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                                                <button type="button" style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid #d1d5db', color: '#4b5563', fontWeight: 600, cursor: 'pointer' }} onClick={() => setActiveFormTab(1)}>
                                                    <i className='bx bx-left-arrow-alt'></i> Back
                                                </button>
                                                <button type="button" className="btn-primary" style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setActiveFormTab(3)}>
                                                    Next Step <i className='bx bx-right-arrow-alt'></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeFormTab === 3 && (
                                        <div className="form-content active" style={{ maxWidth: '600px' }}>
                                            <h3 style={{ marginBottom: '20px', color: '#111827' }}>Images</h3>
                                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                                <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Main Cover Image <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', background: '#f8fafc' }} />
                                                {form.image && !form.image.startsWith('data:') && <div style={{ fontSize: '12px', color: '#10b981', marginTop: '5px' }}><i className='bx bx-link'></i> Using existing image URL</div>}
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Upload a high-quality, transparent background image for best results.</div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                                <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Secondary Image 2 (Optional)</label>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image2')} style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', background: '#f8fafc' }} />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Secondary Image 3 (Optional)</label>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image3')} style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', background: '#f8fafc' }} />
                                            </div>
                                            {(form.image || form.image2 || form.image3) && (
                                                <div style={{ marginTop: '20px', padding: '15px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', gap: '15px', overflowX: 'auto' }}>
                                                    {form.image && <img src={form.image} alt="Main Preview" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} onError={(e) => e.target.style.display = 'none'} />}
                                                    {form.image2 && <img src={form.image2} alt="Preview 2" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} onError={(e) => e.target.style.display = 'none'} />}
                                                    {form.image3 && <img src={form.image3} alt="Preview 3" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} onError={(e) => e.target.style.display = 'none'} />}
                                                </div>
                                            )}

                                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                                                <button type="button" style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid #d1d5db', color: '#4b5563', fontWeight: 600, cursor: 'pointer' }} onClick={() => setActiveFormTab(2)}>
                                                    <i className='bx bx-left-arrow-alt'></i> Back
                                                </button>
                                                <button type="button" className="btn-primary" style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setActiveFormTab(4)}>
                                                    Next Step <i className='bx bx-right-arrow-alt'></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeFormTab === 4 && (
                                        <div className="form-content active" style={{ maxWidth: '800px' }}>
                                            <h3 style={{ marginBottom: '20px', color: '#111827' }}>Description</h3>
                                            <div className="form-group">
                                                <label style={{ color: '#374151', fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Key Features (Comma Separated)</label>
                                                <textarea className="form-input" name="description" value={form.description} onChange={handleFormChange} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', minHeight: '150px', resize: 'vertical' }} placeholder="Feature 1, Feature 2, Feature 3..."></textarea>
                                            </div>
                                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                                                <button type="button" style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid #d1d5db', color: '#4b5563', fontWeight: 600, cursor: 'pointer' }} onClick={() => setActiveFormTab(3)}>
                                                    <i className='bx bx-left-arrow-alt'></i> Back
                                                </button>
                                                <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {loading ? <><i className='bx bx-loader-alt bx-spin'></i> Publishing...</> : <><i className='bx bx-cloud-upload' style={{ fontSize: '18px' }}></i> {form.id ? 'Update Listing' : 'Publish Listing'}</>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </div>
                            {/* --- New Phase 8 Tabs --- */}
                            {activeView === 'finances' && (
                                <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ background: '#fff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                        <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Financial Center</h2>
                                        <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Manage your payouts, bank information, and view fee breakdowns.</p>
                                    </div>

                                    <div className="responsive-flex-row">
                                        {/* Bank Details Form */}
                                        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Payout Information</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '5px' }}>IBAN / Bank Account</label>
                                                    <input type="text" value={financeForm.bank_account} onChange={e => setFinanceForm(p => ({ ...p, bank_account: e.target.value }))} placeholder="PK00 MEZN 0123 4567..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '5px' }}>CNIC / Tax ID</label>
                                                    <input type="text" value={financeForm.cnic} onChange={e => setFinanceForm(p => ({ ...p, cnic: e.target.value }))} placeholder="33100-1234567-1" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                                </div>
                                                <button onClick={handleSaveFinances} disabled={loading} style={{ background: '#0f172a', color: '#fff', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                                    {loading ? <><i className='bx bx-loader-alt bx-spin'></i> Saving...</> : 'Update Details'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Fee Breakdown Table */}
                                        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h3 style={{ margin: 0, fontSize: '16px' }}>Recent Settlement Calculator</h3>
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                <thead style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                                                    <tr>
                                                        <th style={{ padding: '12px 15px', fontWeight: 600 }}>Order ID</th>
                                                        <th style={{ padding: '12px 15px', fontWeight: 600 }}>Gross Price</th>
                                                        <th style={{ padding: '12px 15px', fontWeight: 600 }}>Commission (10%)</th>
                                                        <th style={{ padding: '12px 15px', fontWeight: 600 }}>Fixed Fee</th>
                                                        <th style={{ padding: '12px 15px', fontWeight: 600, textAlign: 'right' }}>Net Payout</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[10500, 4200, 18500].map((price, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '12px 15px', color: '#0f172a', fontWeight: 500 }}>BDX-OP{idx + 1}</td>
                                                            <td style={{ padding: '12px 15px' }}>Rs. {price.toLocaleString()}</td>
                                                            <td style={{ padding: '12px 15px', color: '#ef4444' }}>-Rs. {(price * 0.1).toLocaleString()}</td>
                                                            <td style={{ padding: '12px 15px', color: '#ef4444' }}>-Rs. 20</td>
                                                            <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>Rs. {(price - (price * 0.1) - 20).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )
                            }

                            {
                                activeView === 'messages' && (
                                    <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                                        <div style={{ background: '#fff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Buyer Messages</h2>
                                            <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Respond to customer inquiries within 24 hours to maintain good Account Health.</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '2px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', height: '600px' }}>
                                            {/* Inbox List */}
                                            <div style={{ width: '300px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0' }}>
                                                    <input type="text" placeholder="Search messages..." style={{ width: '100%', padding: '10px 15px', borderRadius: '20px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc' }} />
                                                </div>
                                                <div style={{ overflowY: 'auto', flex: 1 }}>
                                                    {chatMessages.length === 0 ? (
                                                        <div style={{ padding: '30px 15px', textAlign: 'center', color: '#64748b' }}>
                                                            <i className='bx bx-message-square-dots' style={{ fontSize: '40px', color: '#cbd5e1', marginBottom: '10px' }}></i>
                                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>No Messages</div>
                                                            <div style={{ fontSize: '13px', marginTop: '5px' }}>Your inbox is clean.</div>
                                                        </div>
                                                    ) : (
                                                        chatMessages.map(chat => (
                                                            <div key={chat.id} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', background: activeChatId === chat.id ? '#eff6ff' : 'transparent', cursor: 'pointer' }} onClick={() => setActiveChatId(chat.id)}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                    <span style={{ fontWeight: activeChatId === chat.id ? 700 : 600, fontSize: '14px', color: '#0f172a' }}>{chat.sender}</span>
                                                                    <span style={{ fontSize: '11px', color: activeChatId === chat.id ? '#3b82f6' : '#64748b', fontWeight: activeChatId === chat.id ? 600 : 500 }}>{chat.time}</span>
                                                                </div>
                                                                <div style={{ fontSize: '13px', color: activeChatId === chat.id ? '#475569' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.text}</div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                            {/* Chat Window */}
                                            {chatMessages.length === 0 ? (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
                                                    <i className='bx bx-chat' style={{ fontSize: '60px', color: '#e2e8f0', marginBottom: '15px' }}></i>
                                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>Your Inbox is Empty</div>
                                                    <div style={{ fontSize: '14px', marginTop: '5px' }}>Wait for new buyer inquiries to appear here.</div>
                                                </div>
                                            ) : !activeChatId ? (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
                                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>Select a conversation</div>
                                                </div>
                                            ) : chatMessages.filter(c => c.id === activeChatId).map(chat => (
                                                <div key={chat.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                                                    <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                                        <h3 style={{ margin: 0, fontSize: '16px' }}>{chat.sender}</h3>
                                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Regarding: {chat.product}</div>
                                                    </div>
                                                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                        <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '12px 15px', borderRadius: '12px 12px 12px 0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '70%', fontSize: '14px' }}>
                                                            {chat.text}
                                                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '5px', textAlign: 'right' }}>{chat.time}</div>
                                                        </div>
                                                        {chat.replies.map((reply, i) => (
                                                            <div key={i} style={{ alignSelf: 'flex-end', background: '#f97316', color: '#fff', padding: '12px 15px', borderRadius: '12px 12px 0 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '70%', fontSize: '14px' }}>
                                                                {reply.text}
                                                                <div style={{ fontSize: '10px', color: '#ffedd5', marginTop: '5px', textAlign: 'right' }}>{reply.time}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ padding: '20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
                                                        <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendChatReply()} placeholder="Type your reply..." style={{ flex: 1, padding: '12px 15px', borderRadius: '24px', border: '1px solid #e2e8f0', outline: 'none' }} />
                                                        <button onClick={handleSendChatReply} style={{ background: '#f97316', color: '#fff', width: '45px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className='bx bx-send' style={{ fontSize: '20px' }}></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeView === 'reviews' && (
                                    <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div>
                                                <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Product Reviews Manager</h2>
                                                <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Read and reply to verified customer reviews.</p>
                                            </div>
                                            <select style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', fontWeight: 600, color: '#475569' }} value={reviewFilter} onChange={e => setReviewFilter(e.target.value)}>
                                                <option value="All">All Reviews</option>
                                                <option value="Product">Product Feedback</option>
                                                <option value="Order">Order/Delivery Feedback</option>
                                            </select>
                                        </div>
                                        <div className="dashboard-grid">
                                            {(() => {
                                                const filteredReviews = reviewsList.filter(r => reviewFilter === 'All' || r.type === reviewFilter);
                                                if (filteredReviews.length === 0) {
                                                    return (
                                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                            <i className='bx bx-star' style={{ fontSize: '60px', color: '#cbd5e1', marginBottom: '15px' }}></i>
                                                            <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>No Reviews Yet</div>
                                                            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>When buyers leave feedback, it will appear here.</div>
                                                        </div>
                                                    );
                                                }
                                                return filteredReviews.map((review) => (
                                                    <div key={review.id} style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontWeight: 600 }}>{review.user}</span>
                                                                <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>{review.type}</span>
                                                            </div>
                                                            <div style={{ color: '#64748b', fontSize: '12px' }}>{review.date}</div>
                                                        </div>
                                                        <div style={{ color: '#eab308', fontSize: '14px', marginBottom: '10px', letterSpacing: '2px' }}>
                                                            {Array(5).fill(0).map((_, i) => <i key={i} className={i < review.stars ? 'bx bxs-star' : 'bx bx-star'} style={{ color: i < review.stars ? '#eab308' : '#cbd5e1' }}></i>)}
                                                        </div>
                                                        <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 15px 0', flex: 1 }}>"{review.text}"</p>

                                                        {review.reply ? (
                                                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #f97316', fontSize: '13px' }}>
                                                                <span style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '5px' }}>Your Reply:</span>
                                                                {review.reply}
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                                <input type="text" placeholder="Type a public reply..." style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }} onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        setReviewsList(prev => prev.map(r => r.id === review.id ? { ...r, reply: e.target.value } : r));
                                                                    }
                                                                }} />
                                                                <button style={{ background: '#f97316', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }} onClick={(e) => {
                                                                    const input = e.target.previousSibling;
                                                                    if (input.value) {
                                                                        setReviewsList(prev => prev.map(r => r.id === review.id ? { ...r, reply: input.value } : r));
                                                                    }
                                                                }}>Reply</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeView === 'profile' && (
                                    <div className="seller-section active" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0', color: '#94a3b8' }}>
                                                    <i className='bx bx-store-alt' style={{ fontSize: '40px' }}></i>
                                                </div>
                                                <div>
                                                    <h2 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>{currentUser?.brand_name || 'My Store'}</h2>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                                                        <span style={{ fontSize: '14px', color: '#64748b' }}>Store ID: {currentUser?.seller_id || 'N/A'}</span>
                                                        <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><i className='bx bxs-badge-check'></i> Verified Seller</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isEditingProfile ? (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button style={{ padding: '10px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsEditingProfile(false)}>Cancel</button>
                                                    <button style={{ padding: '10px 20px', background: '#f97316', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={handleSaveProfile}>{loading ? 'Saving...' : 'Save Changes'}</button>
                                                </div>
                                            ) : (
                                                <button style={{ padding: '10px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setProfileForm({ brand_name: currentUser?.brand_name || '', name: currentUser?.name || '', phone: currentUser?.phone || '' }); setIsEditingProfile(true); }}><i className='bx bx-edit-alt'></i> Edit Profile</button>
                                            )}
                                        </div>

                                        <div className="responsive-grid-2">
                                            {/* Business Information */}
                                            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                                                    <i className='bx bx-buildings' style={{ color: '#f97316' }}></i> Business Information
                                                </h3>
                                                <div style={{ display: 'grid', gap: '15px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Legal Entity Name</div>
                                                        {isEditingProfile ? <input type="text" value={profileForm.brand_name} onChange={e => setProfileForm(p => ({ ...p, brand_name: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} /> : <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{currentUser?.brand_name || 'My Store'} LLC</div>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Owner Name</div>
                                                        {isEditingProfile ? <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} /> : <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{currentUser?.name || 'N/A'}</div>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Registered Email Address</div>
                                                        <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{currentUser?.email || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Primary Phone Number</div>
                                                        {isEditingProfile ? <input type="text" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} /> : <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{currentUser?.phone || '+92 300 1234567'}</div>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Business Address</div>
                                                        <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>123 Industrial Area, Block C, Building Materials Market, Lahore, PK</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tax & Financial Configuration */}
                                            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                                                    <i className='bx bx-file' style={{ color: '#f97316' }}></i> Compliance & Logistics
                                                </h3>
                                                <div style={{ display: 'grid', gap: '15px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>National Tax Number (NTN)</div>
                                                        <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>1234567-8</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Default Dispatch Center</div>
                                                        <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>BuildX Sorting Hub (Lahore Sector)</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        </div >

                        {/* Seller Cancellation Modal */}
                        {
                            sellerCancelModal.show && (
                                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease' }}>
                                    <div style={{ background: '#fff', padding: '35px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', position: 'relative' }}>
                                        <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#ef4444'} onMouseOut={e => e.target.style.color = '#94a3b8'} onClick={() => setSellerCancelModal({ show: false, orderId: null, reason: '' })}>
                                            <i className='bx bx-x'></i>
                                        </button>
                                        <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <i className='bx bx-error-circle' style={{ color: '#f97316' }}></i> Cancel Order
                                        </h2>
                                        <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
                                            Please select a reason for cancelling order <strong>#{sellerCancelModal.orderId.slice(0, 8).toUpperCase()}</strong>. This will notify the buyer immediately.
                                        </p>
                                        <select
                                            value={sellerCancelModal.reason}
                                            onChange={e => setSellerCancelModal({ ...sellerCancelModal, reason: e.target.value })}
                                            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '25px', outline: 'none', fontSize: '14px', color: '#1e293b', appearance: 'none', background: '#f8fafc url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 15px top 50%', backgroundSize: '12px auto' }}
                                        >
                                            <option value="">Select a reason...</option>
                                            <option value="Out of stock">Out of stock</option>
                                            <option value="Pricing error">Pricing error</option>
                                            <option value="Damaged item">Damaged item</option>
                                            <option value="Shipping address undeliverable">Shipping address undeliverable</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <button style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; }} onMouseOut={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e2e8f0'; }} onClick={() => setSellerCancelModal({ show: false, orderId: null, reason: '' })}>
                                                Close
                                            </button>
                                            <button style={{ flex: 1, padding: '12px', background: '#f97316', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(249, 115, 22, 0.25)' }} onMouseOver={e => e.target.style.background = '#ea580c'} onMouseOut={e => e.target.style.background = '#f97316'} onClick={submitSellerCancelRequest}>
                                                Submit Cancellation
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                )}
            </div>

            {/* Mobile Overlay */}
            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
        </div>
    );
};

export default SellerDashboard;
