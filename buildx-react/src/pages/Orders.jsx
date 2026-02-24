import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Orders = () => {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const loadOrders = async () => {
        setLoading(true);
        let fetchedOrders = [];
        if (currentUser) {
            try {
                let query = supabase.from("orders").select("*").order("id", { ascending: false });
                if (currentUser.role !== "seller") {
                    query = query.eq("customer_email", currentUser.email);
                }
                const { data, error } = await query;
                if (error) throw error;
                fetchedOrders = data || [];
            } catch (e) {
                console.error("Supabase load error:", e.message);
                toast.error("Failed to load orders.");
            }
        }
        setOrders(fetchedOrders);
        setLoading(false);
    };

    useEffect(() => {
        loadOrders();
    }, [currentUser]);

    const updateStatus = async (orderId, newStatus) => {
        try {
            const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
            if (error) throw new Error("SUPABASE_UPDATE_ERROR");
            loadOrders();
        } catch (e) {
            console.error("Supabase update failed:", e.message);
            toast.error("Failed to update status.");
        }
    };

    const filteredOrders = orders.filter(o =>
        JSON.stringify(o).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <i className='bx bx-loader-alt bx-spin' style={{ fontSize: '40px', color: 'var(--primary)' }}></i>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
                <h2 className="section-title" style={{ margin: 0 }}><i className='bx bx-history' style={{ color: 'var(--primary)' }}></i> Order History</h2>
                <div className="search-box" style={{ position: 'relative', width: '300px' }}>
                    <i className='bx bx-search' style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '20px' }}></i>
                    <input
                        type="text"
                        placeholder="Search orders, items..."
                        className="form-input"
                        style={{ paddingLeft: '45px', marginBottom: 0 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div id="ordersList" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', borderRadius: '16px' }}>
                        <i className='bx bx-package' style={{ fontSize: '80px', color: 'var(--text-muted)', marginBottom: '20px' }}></i>
                        <h2 style={{ fontWeight: 700, marginBottom: '15px' }}>No Orders Yet</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>You haven&apos;t placed any orders. Start building your dream space today!</p>
                        <button className='btn-primary' style={{ width: 'auto', padding: '12px 30px' }} onClick={() => navigate('/')}>Shop Now</button>
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const orderDate = new Date(order.created_at || order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                        let progressWidth = "0%";
                        let step1Class = "active";
                        let step2Class = "";
                        let step3Class = "";
                        if (order.status === "Shipped") {
                            progressWidth = "50%";
                            step1Class = "completed";
                            step2Class = "active";
                        } else if (order.status === "Delivered") {
                            progressWidth = "100%";
                            step1Class = "completed";
                            step2Class = "completed";
                            step3Class = "completed";
                        }

                        const itemsObj = order.items || {};
                        const isOwnOrder = order.customer_email === currentUser?.email;

                        return (
                            <div key={order.id} className="order-card" style={{ background: 'var(--surface)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                                <div className="order-summary-bar" style={{ background: '#f9fafb', padding: '20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '20px' }}>
                                    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                        <div className="order-stat">
                                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Order Placed</label>
                                            <strong style={{ display: 'block', color: 'var(--text-dark)' }}>{orderDate}</strong>
                                        </div>
                                        <div className="order-stat">
                                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Total</label>
                                            <strong style={{ display: 'block', color: 'var(--text-dark)' }}>PKR {order.total?.toLocaleString()}</strong>
                                        </div>
                                        <div className="order-stat">
                                            <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Ship To</label>
                                            <strong style={{ display: 'block', color: 'var(--primary)', cursor: 'pointer' }}>{order.customer_name || order.customerName}</strong>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Order #</div>
                                        <strong style={{ color: 'var(--text-dark)' }}>{order.id}</strong>
                                    </div>
                                </div>

                                <div className="order-body" style={{ padding: '30px 20px' }}>
                                    <div className="tracking-timeline" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '10px 20px 40px', paddingTop: '20px' }}>
                                        <div style={{ content: '""', position: 'absolute', top: '30px', left: '10%', right: '10%', height: '4px', background: '#e5e7eb', zIndex: 1, borderRadius: '2px' }}></div>
                                        <div className="tracking-progress-bar" style={{ position: 'absolute', top: '30px', left: '10%', height: '4px', background: 'var(--primary)', zIndex: 2, borderRadius: '2px', width: progressWidth, transition: 'width 0.4s ease' }}></div>

                                        <div className={`tracking-step ${step1Class}`} style={{ textAlign: 'center', position: 'relative', zIndex: 3, width: '100px' }}>
                                            <div className="tracking-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', background: step1Class ? 'var(--primary)' : '#fff', color: step1Class ? '#fff' : '#d1d5db', border: step1Class ? 'none' : '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px' }}><i className='bx bx-list-check'></i></div>
                                            <div className="tracking-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>Order Placed</div>
                                        </div>

                                        <div className={`tracking-step ${step2Class}`} style={{ textAlign: 'center', position: 'relative', zIndex: 3, width: '100px' }}>
                                            <div className="tracking-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', background: step2Class || step3Class ? 'var(--primary)' : '#fff', color: step2Class || step3Class ? '#fff' : '#d1d5db', border: step2Class || step3Class ? 'none' : '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px' }}><i className={'bx bx-truck'}></i></div>
                                            <div className="tracking-label" style={{ fontSize: '13px', fontWeight: 600, color: step2Class || step3Class ? 'var(--text-dark)' : 'var(--text-muted)', marginBottom: '3px' }}>Shipped</div>
                                        </div>

                                        <div className={`tracking-step ${step3Class}`} style={{ textAlign: 'center', position: 'relative', zIndex: 3, width: '100px' }}>
                                            <div className="tracking-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', background: step3Class ? 'var(--primary)' : '#fff', color: step3Class ? '#fff' : '#d1d5db', border: step3Class ? 'none' : '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px' }}><i className={'bx bx-check'}></i></div>
                                            <div className="tracking-label" style={{ fontSize: '13px', fontWeight: 600, color: step3Class ? 'var(--text-dark)' : 'var(--text-muted)', marginBottom: '3px' }}>Delivered</div>
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '16px', color: 'var(--text-dark)', margin: '30px 0 15px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>Ordered Items</h3>
                                    {Object.values(itemsObj).map(item => (
                                        <div key={item.id} className="item-row" style={{ display: 'flex', gap: '20px', padding: '15px 0', borderBottom: '1px solid #f9fafb', alignItems: 'center' }}>
                                            <img src={item.image} alt={item.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                                            <div className="item-details" style={{ flex: 1 }}>
                                                <h4 style={{ fontSize: '16px', marginBottom: '5px' }}>{item.name}</h4>
                                                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sold by: {item.brand || "BuildX"}</div>
                                                <div className="item-actions" style={{ marginTop: '10px' }}>
                                                    <button className="btn-primary" style={{ width: 'auto', padding: '8px 15px', fontSize: '13px' }} onClick={() => navigate(`/product/${item.id}`)}>Buy it again</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {currentUser?.role === 'seller' && !isOwnOrder && (
                                    <div className="seller-toolbar" style={{ background: '#fff4ed', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderTop: '1px solid #fed7aa' }}>
                                        <i className='bx bxs-store-alt' style={{ color: 'var(--primary)', fontSize: '24px' }}></i>
                                        <strong style={{ fontSize: '14px', color: 'var(--text-dark)' }}>Seller Controls:</strong>
                                        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }} onClick={() => updateStatus(order.id, 'Shipped')}>Mark Shipped</button>
                                        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }} onClick={() => updateStatus(order.id, 'Delivered')}>Mark Delivered</button>
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 'auto' }}>Current: <b>{order.status}</b></span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Orders;
