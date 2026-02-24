import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const Checkout = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        phone: '',
        address: '',
        city: '',
        paymentMethod: 'COD'
    });

    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.address || !formData.city) {
            return alert("Please fill all shipping details.");
        }

        setLoading(true);

        const platform_fee = 20;
        const commission_fee = cartTotal * 0.10;
        const net_payout = cartTotal - commission_fee - platform_fee;

        const orderData = {
            customer_email: currentUser?.email || 'guest@guest.com',
            customer_name: formData.name,
            total: cartTotal + 15,
            subtotal: cartTotal,
            service_fee: 15,
            commission_fee: commission_fee,
            platform_fee: platform_fee,
            net_payout: net_payout,
            status: "Pending",
            items: cart,
            shipping_address: `${formData.address}, ${formData.city}`,
            phone: formData.phone,
            payment_method: formData.paymentMethod
        };

        try {
            const { error } = await supabase.from("orders").insert([orderData]);
            if (error) throw error;

            // Update product stock sequentially
            for (const item of Object.values(cart)) {
                const newStock = item.stock - item.qty;
                await supabase.from("products").update({ stock: newStock }).eq("id", item.id);
            }

            finishOrder();

        } catch (err) {
            console.error("Order error:", err);
            alert("Failed to place order. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const finishOrder = () => {
        setTimeout(() => {
            clearCart();
            navigate('/thank-you');
        }, 1000);
    };

    if (Object.keys(cart).length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <h2>Your cart is empty.</h2>
                <button className="btn-secondary" onClick={() => navigate('/')}>Continue Shopping</button>
            </div>
        );
    }

    return (
        <div className="responsive-flex-row" style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>

            <div style={{ flex: '2', width: '100%' }}>
                <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' }}>
                    <h2 style={{ marginBottom: '20px' }}>Shipping Details</h2>
                    <form style={{ display: 'grid', gap: '15px' }}>
                        <label className="form-group">
                            Full Name
                            <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} />
                        </label>
                        <label className="form-group">
                            Phone Number
                            <input type="text" name="phone" className="form-input" value={formData.phone} onChange={handleChange} />
                        </label>
                        <label className="form-group">
                            Full Address
                            <input type="text" name="address" className="form-input" value={formData.address} onChange={handleChange} />
                        </label>
                        <label className="form-group">
                            City
                            <input type="text" name="city" className="form-input" value={formData.city} onChange={handleChange} />
                        </label>
                    </form>
                </div>

                <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <h2 style={{ marginBottom: '20px' }}>Payment Method</h2>
                    <label style={{ display: 'block', padding: '15px', border: '2px solid var(--primary)', borderRadius: '8px', background: '#fff4ed', cursor: 'pointer' }}>
                        <input type="radio" name="paymentMethod" value="COD" checked onChange={handleChange} style={{ marginRight: '10px' }} />
                        <strong>Cash on Delivery (COD)</strong>
                    </label>
                </div>
            </div>

            <div style={{ flex: '1' }}>
                <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '16px', boxShadow: 'var(--shadow-md)', position: 'sticky', top: '100px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #f3f4f6' }}>Order Summary</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-muted)' }}>
                        <span>Subtotal</span>
                        <span style={{ fontWeight: '500', color: 'var(--text-dark)' }}>PKR {cartTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-muted)' }}>
                        <span>Platform Fee</span>
                        <span style={{ fontWeight: '500', color: 'var(--text-dark)' }}>PKR 15</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-muted)' }}>
                        <span>Shipping</span>
                        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>FREE</span>
                    </div>

                    {/* Promo Code Input */}
                    <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
                        <input type="text" placeholder="Enter Promo Code" style={{ flex: '1', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', outline: 'none' }} />
                        <button style={{ padding: '10px 20px', background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }} onClick={(e) => e.preventDefault()} onMouseOver={e => e.target.style.background = '#e5e7eb'} onMouseOut={e => e.target.style.background = '#f3f4f6'}>Apply</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '25px' }}>
                        <span>Total Amount</span>
                        <span style={{ color: 'var(--primary)' }}>PKR {(cartTotal + 15).toLocaleString()}</span>
                    </div>

                    {/* Estimated Delivery logic */}
                    <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className='bx bx-stopwatch' style={{ fontSize: '24px', color: '#16a34a' }}></i>
                        <div>
                            <div style={{ fontSize: '12px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimated Delivery</div>
                            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '600', marginTop: '3px' }}>3 - 5 Business Days</div>
                        </div>
                    </div>

                    <button className="btn-primary" onClick={handlePlaceOrder} disabled={loading} style={{ width: '100%', fontSize: '16px', fontWeight: '700', padding: '15px' }}>
                        {loading ? <><i className='bx bx-loader-alt bx-spin'></i> Processing...</> : "Place Order Now"}
                    </button>

                    <div style={{ marginTop: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i className='bx bx-lock-alt' ></i> Secure Checkout</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i className='bx bx-package' ></i> Fast Delivery</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
