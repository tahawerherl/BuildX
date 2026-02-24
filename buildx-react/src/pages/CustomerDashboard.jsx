import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CustomerDashboard = () => {
    const { currentUser, logout } = useAuth();
    const [activeView, setActiveView] = useState('overview'); // overview, orders, wishlist, addresses, profile
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [cancelModal, setCancelModal] = useState({ show: false, orderId: null, reason: '' });

    const loadOrders = async () => {
        setLoading(true);
        if (currentUser) {
            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("customer_email", currentUser.email)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                setOrders(data || []);
            } catch (e) {
                console.error("Supabase load error:", e.message);
                toast.error("Failed to load orders from server.");
            }
        }
        setLoading(false);
    };

    const openCancelModal = (orderId) => {
        setCancelModal({ show: true, orderId, reason: '' });
    };

    const submitCancelRequest = async () => {
        const { orderId, reason } = cancelModal;
        if (!reason) return toast.error("Please select a reason for cancellation.");

        try {
            const { error } = await supabase
                .from("orders")
                .update({ status: 'Cancellation Requested', cancelReason: reason })
                .eq("id", orderId);

            if (error) throw error;

            setCancelModal({ show: false, orderId: null, reason: '' });
            toast.success("Cancellation request synced with Seller");
            loadOrders();

        } catch (error) {
            console.error("Error cancelling order:", error);
            toast.error("Failed to request cancellation.");
        }
    };

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'customer') {
            navigate('/');
            return;
        }

        loadOrders();

        const channel = supabase.channel('customer-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_email=eq.${currentUser.email}` }, (payload) => {
                loadOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, navigate]);

    if (!currentUser) return null;

    const totalSpent = orders.filter(o => o.status !== "Cancelled" && o.status !== "Cancellation Requested").reduce((sum, order) => sum + (order.total || 0), 0);
    const activeOrders = orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled" && o.status !== "Cancellation Requested").length;

    return (
        <div className="dashboard-container">

            {/* Cancellation Modal (Home Depot Style) */}
            {cancelModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '450px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ background: '#f97316', padding: '20px', color: '#fff', borderBottom: '4px solid #ea580c' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className='bx bx-error-circle'></i> Request Cancellation
                            </h3>
                        </div>
                        <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <p style={{ margin: 0, color: '#4b5563', fontSize: '15px' }}>Why do you want to cancel order <strong>#{cancelModal.orderId}</strong>?</p>

                            <select
                                value={cancelModal.reason}
                                onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })}
                                style={{ padding: '12px 15px', borderRadius: '8px', border: '2px solid #e5e7eb', fontSize: '15px', color: '#1f2937', outline: 'none', background: '#f9fafb', cursor: 'pointer' }}
                            >
                                <option value="">Select a reason...</option>
                                <option value="Ordered by mistake">Ordered by mistake</option>
                                <option value="Found better price">Found better price elsewhere</option>
                                <option value="Shipping time too long">Shipping time is too long</option>
                                <option value="Item no longer needed">Item is no longer needed</option>
                                <option value="Other">Other</option>
                            </select>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', background: '#fff', color: '#4b5563', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setCancelModal({ show: false, orderId: null, reason: '' })}>Keep Order</button>
                                <button style={{ flex: 1, padding: '12px', border: 'none', background: '#f97316', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={submitCancelRequest}>Submit Request</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Navigation */}
            <div className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: '30px 20px', borderBottom: '1px solid #334155' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className='bx bx-user-circle' style={{ color: '#f97316', fontSize: '28px' }}></i>
                        My Account
                    </h2>
                    <div style={{ marginTop: '15px', background: '#334155', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Status</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
                    </div>
                </div>

                <nav style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginBottom: '10px' }}>Dashboard</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'overview' ? '#fff' : '#cbd5e1', background: activeView === 'overview' ? '#f97316' : 'transparent', fontWeight: activeView === 'overview' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('overview'); }}>
                        <i className='bx bx-grid-alt' style={{ fontSize: '20px', color: activeView === 'overview' ? '#fff' : 'inherit' }}></i> Account Overview
                    </a>

                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginTop: '20px', marginBottom: '10px' }}>Purchases</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'orders' ? '#fff' : '#cbd5e1', background: activeView === 'orders' ? '#f97316' : 'transparent', fontWeight: activeView === 'orders' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('orders'); }}>
                        <i className='bx bx-package' style={{ fontSize: '20px', color: activeView === 'orders' ? '#fff' : 'inherit' }}></i> Order History
                        {activeOrders > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '20px', marginLeft: 'auto', fontWeight: 700 }}>{activeOrders}</span>}
                    </a>

                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'wishlist' ? '#fff' : '#cbd5e1', background: activeView === 'wishlist' ? '#f97316' : 'transparent', fontWeight: activeView === 'wishlist' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('wishlist'); }}>
                        <i className='bx bx-heart' style={{ fontSize: '20px', color: activeView === 'wishlist' ? '#fff' : 'inherit' }}></i> Saved Items
                    </a>

                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', padding: '0 10px', marginTop: '20px', marginBottom: '10px' }}>Settings</div>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'addresses' ? '#fff' : '#cbd5e1', background: activeView === 'addresses' ? '#f97316' : 'transparent', fontWeight: activeView === 'addresses' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('addresses'); }}>
                        <i className='bx bx-map' style={{ fontSize: '20px', color: activeView === 'addresses' ? '#fff' : 'inherit' }}></i> Address Book
                    </a>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: activeView === 'profile' ? '#fff' : '#cbd5e1', background: activeView === 'profile' ? '#f97316' : 'transparent', fontWeight: activeView === 'profile' ? 600 : 500, transition: 'all 0.2s' }} onClick={(e) => { e.preventDefault(); setActiveView('profile'); }}>
                        <i className='bx bx-user-circle' style={{ fontSize: '20px', color: activeView === 'profile' ? '#fff' : 'inherit' }}></i> Profile Details
                    </a>
                    <a href="#" style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: 500, transition: 'all 0.2s', marginTop: '10px' }} onClick={(e) => { e.preventDefault(); logout(); navigate('/auth'); }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.4s ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div>
                                <h1 style={{ fontSize: '28px', color: '#0f172a', margin: '0 0 10px 0' }}>Welcome back, {currentUser.name.split(' ')[0]}!</h1>
                                <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Manage your orders, track shipments, and update your preferences here.</p>
                            </div>
                            <button style={{ padding: '12px 24px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(249, 115, 22, 0.2)' }} onClick={() => navigate('/')}>
                                <i className='bx bx-shopping-bag'></i> Continue Shopping
                            </button>
                        </div>

                        <div className="responsive-grid-3">
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#fcf8ff', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                                    <i className='bx bx-package'></i>
                                </div>
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Active Orders</div>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{activeOrders}</div>
                                </div>
                            </div>
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                                    <i className='bx bx-wallet'></i>
                                </div>
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Total Spent</div>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>PKR {totalSpent.toLocaleString()}</div>
                                </div>
                            </div>
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                                    <i className='bx bx-check-shield'></i>
                                </div>
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Account Tier</div>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Gold Member</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Orders Snapshot */}
                        <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Recent Orders</h3>
                                <button style={{ background: 'transparent', border: 'none', color: '#f97316', fontWeight: 600, cursor: 'pointer' }} onClick={() => setActiveView('orders')}>View All</button>
                            </div>
                            {orders.slice(0, 2).map((order) => (
                                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>Order #{order.id}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{new Date(order.created_at || order.date).toLocaleDateString()} &middot; {Object.keys(order.items || {}).length} Items</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>PKR {order.total?.toLocaleString()}</div>
                                        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: order.status === 'Delivered' ? '#dcfce7' : (order.status === 'Cancelled' || order.status === 'Cancelled by Seller') ? '#fee2e2' : order.status === 'Cancellation Requested' ? '#fef3c7' : '#fffbeb', color: order.status === 'Delivered' ? '#166534' : (order.status === 'Cancelled' || order.status === 'Cancelled by Seller') ? '#991b1b' : order.status === 'Cancellation Requested' ? '#92400e' : '#b45309', fontWeight: 600, display: 'inline-block', marginTop: '5px' }}>{order.status}</span>
                                    </div>
                                </div>
                            ))}
                            {orders.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px' }}>No recent orders.</div>}
                        </div>
                    </div>
                )}

                {activeView === 'orders' && (
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 30px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className='bx bx-history' style={{ color: '#f97316' }}></i> Complete Order History
                        </h2>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px' }}>
                                <i className='bx bx-loader-alt bx-spin' style={{ fontSize: '40px', color: '#f97316' }}></i>
                            </div>
                        ) : orders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#94a3b8', fontSize: '40px' }}>
                                    <i className='bx bx-shopping-bag'></i>
                                </div>
                                <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>No Orders Found</h3>
                                <p style={{ color: '#64748b', marginBottom: '25px' }}>You haven't placed any orders yet. Start exploring our catalog.</p>
                                <button style={{ padding: '12px 24px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/')}>Explore Catalog</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                {orders.map(order => {
                                    const orderDate = new Date(order.created_at || order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                                    let progressWidth = "0%";
                                    let step1Class = "active";
                                    let step2Class = "";
                                    let step3Class = "";
                                    let stopProgress = false;
                                    let isCancelled = order.status === "Cancelled" || order.status === "Cancelled by Seller";
                                    let isCancelRequested = order.status === "Cancellation Requested";

                                    if (order.status === "Shipped") { progressWidth = "50%"; step1Class = "completed"; step2Class = "active"; }
                                    else if (order.status === "Delivered") { progressWidth = "100%"; step1Class = "completed"; step2Class = "completed"; step3Class = "completed"; }
                                    else if (isCancelled || isCancelRequested) { progressWidth = "0%"; step1Class = "cancelled"; }

                                    let itemsObj = [];
                                    try {
                                        itemsObj = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
                                    } catch (e) {
                                        itemsObj = [];
                                    }

                                    return (
                                        <div key={order.id} style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden', opacity: isCancelled ? 0.75 : 1 }}>
                                            <div style={{ background: '#f8fafc', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Order Placed</div>
                                                        <div style={{ color: '#0f172a', fontWeight: 600 }}>{orderDate}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Amount</div>
                                                        <div style={{ color: '#0f172a', fontWeight: 600 }}>PKR {order.total?.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    {(order.status === 'Pending' || order.status === 'Processing' || order.status === 'Order Placed') && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); openCancelModal(order.id); }}
                                                            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                                            onMouseOver={e => { e.target.style.background = '#fef2f2'; }}
                                                            onMouseOut={e => { e.target.style.background = 'transparent'; }}
                                                        >
                                                            <i className='bx bx-x-circle' style={{ color: '#ef4444', fontSize: '16px' }}></i> Request Cancellation
                                                        </button>
                                                    )}
                                                    {isCancelRequested && (
                                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><i className='bx bx-time-five'></i> Cancellation Pending</span>
                                                    )}
                                                    <div>
                                                        <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Order Number</div>
                                                        <div style={{ color: '#0f172a', fontWeight: 700 }}>#{order.id}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ padding: '35px 30px' }}>
                                                {/* Timeline Layout */}
                                                {!isCancelled ? (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '0 40px 40px', paddingTop: '20px' }}>
                                                        <div style={{ content: '""', position: 'absolute', top: '30px', left: '10%', right: '10%', height: '4px', background: '#f1f5f9', zIndex: 1, borderRadius: '2px' }}></div>
                                                        <div style={{ position: 'absolute', top: '30px', left: '10%', height: '4px', background: '#10b981', zIndex: 2, borderRadius: '2px', width: progressWidth, transition: 'width 0.4s ease' }}></div>

                                                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 3, width: '100px' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: step1Class ? '#10b981' : '#fff', color: step1Class ? '#fff' : '#cbd5e1', border: step1Class ? 'none' : '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px', transition: 'all 0.3s' }}><i className='bx bx-list-check'></i></div>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '3px' }}>Order Placed</div>
                                                        </div>

                                                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 3, width: '100px' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: step2Class || step3Class ? '#10b981' : '#fff', color: step2Class || step3Class ? '#fff' : '#cbd5e1', border: step2Class || step3Class ? 'none' : '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px', transition: 'all 0.3s' }}><i className='bx bx-package'></i></div>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: step2Class || step3Class ? '#0f172a' : '#64748b', marginBottom: '3px' }}>Packing/Shipped</div>
                                                        </div>

                                                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 3, width: '100px' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: step3Class ? '#10b981' : '#fff', color: step3Class ? '#fff' : '#cbd5e1', border: step3Class ? 'none' : '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px', transition: 'all 0.3s' }}><i className='bx bx-check'></i></div>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: step3Class ? '#0f172a' : '#64748b', marginBottom: '3px' }}>Delivered</div>
                                                        </div>
                                                    </div>
                                                ) : isCancelRequested ? (
                                                    <div style={{ padding: '20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px', color: '#92400e' }}>
                                                        <div style={{ fontSize: '32px' }}><i className='bx bx-time'></i></div>
                                                        <div>
                                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Cancellation Requested</h4>
                                                            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>Your request is pending seller approval. You will not be charged if approved.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px', color: '#991b1b' }}>
                                                        <div style={{ fontSize: '32px' }}><i className='bx bx-x-circle'></i></div>
                                                        <div>
                                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{order.status === 'Cancelled by Seller' ? 'Order Cancelled by Seller' : 'Order Cancelled'}</h4>
                                                            <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>
                                                                {order.status === 'Cancelled by Seller' && order.cancelReason
                                                                    ? `Reason: ${order.cancelReason}`
                                                                    : 'This order has been cancelled completely.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="dashboard-grid">
                                                    {(Array.isArray(itemsObj) ? itemsObj : Object.values(itemsObj)).map((item, idx) => {
                                                        const itemQty = item.quantity || item.q || 1;
                                                        const itemPrice = item.price || 0;
                                                        return (
                                                            <div key={item.id || idx} style={{ display: 'flex', gap: '15px', padding: '15px', border: '1px solid #f1f5f9', borderRadius: '12px', alignItems: 'center' }}>
                                                                <div style={{ flexShrink: 0, width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                                                                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <h4 style={{ fontSize: '15px', margin: '0 0 5px 0', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                                                                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Qty: {itemQty} &middot; Sold by {item.brand || "BuildX"}</div>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>PKR {(itemPrice * itemQty).toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'wishlist' && (
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 30px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className='bx bx-heart' style={{ color: '#f97316' }}></i> Saved Items
                        </h2>
                        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#f43f5e', fontSize: '40px' }}>
                                <i className='bx bx-heart'></i>
                            </div>
                            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Your Wishlist is Empty</h3>
                            <p style={{ color: '#64748b', marginBottom: '25px' }}>Save items you like to review them later.</p>
                            <button style={{ padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/')}>Continue Shopping</button>
                        </div>
                    </div>
                )}

                {activeView === 'addresses' && (
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 30px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className='bx bx-map' style={{ color: '#f97316' }}></i> Address Book
                        </h2>
                        <div className="dashboard-grid">
                            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = '#f97316'} onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                <i className='bx bx-plus' style={{ fontSize: '40px', marginBottom: '10px' }}></i>
                                <span style={{ fontWeight: 600 }}>Add New Address</span>
                            </div>

                            <div style={{ background: '#fff', borderRadius: '16px', padding: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative', border: '1px solid #f97316' }}>
                                <div style={{ position: 'absolute', top: '25px', right: '25px', background: '#fffbeb', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>Default</div>
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className='bx bx-home-alt'></i> Home Address
                                </h3>
                                <div style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>
                                    {currentUser.name}<br />
                                    123 Street Name, DHA Phase 5<br />
                                    Lahore, Punjab, PK 54000<br />
                                    Phone: {currentUser.phone || '+92 3XX XXXXXXX'}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button style={{ padding: '6px 15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Edit</button>
                                    <button style={{ padding: '6px 15px', background: '#fff1f2', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#e11d48', cursor: 'pointer' }}>Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'profile' && (
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 30px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className='bx bx-user-circle' style={{ color: '#f97316' }}></i> Profile Details
                        </h2>
                        <div style={{ maxWidth: '600px', background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', paddingBottom: '30px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f8fafc', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#94a3b8' }}>
                                    <i className='bx bx-user'></i>
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#0f172a' }}>{currentUser.name}</h3>
                                    <div style={{ color: '#64748b' }}>Customer Account</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Full Name</label>
                                    <input type="text" defaultValue={currentUser.name} style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }} readOnly />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Email Address</label>
                                    <input type="email" defaultValue={currentUser.email} style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' }} readOnly />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Phone Number</label>
                                    <input type="tel" placeholder="Add a phone number" style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }} />
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <button style={{ padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard;
