import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
    const { cart, updateQty, cartTotal, cartCount } = useCart();
    const navigate = useNavigate();

    const handleQtyChange = (id, currentQty, delta, maxStock) => {
        const newQty = currentQty + delta;
        if (newQty > maxStock) {
            alert("Requested quantity exceeds available stock.");
            return;
        }
        updateQty(id, newQty);
    };

    const handleRemove = (id) => {
        updateQty(id, 0);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
            <h2 className="section-title"><i className='bx bx-cart-alt' style={{ color: 'var(--primary)' }}></i> Your Cart</h2>

            {cartCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', borderRadius: '16px' }}>
                    <i className='bx bx-cart' style={{ fontSize: '80px', color: 'var(--text-muted)', marginBottom: '20px' }}></i>
                    <h2 style={{ fontWeight: 700, marginBottom: '15px' }}>Your Cart is Empty</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Looks like you haven&apos;t added any items to your cart yet.</p>
                    <button className="btn-primary" style={{ width: 'auto', padding: '12px 30px' }} onClick={() => navigate('/')}>Start Shopping</button>
                </div>
            ) : (
                <div className="cart-container responsive-flex-row">
                    <div className="cart-items" style={{ flex: '2', width: '100%' }}>
                        {Object.values(cart).map(item => (
                            <div key={item.id} className="cart-item" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', padding: '20px', borderRadius: '16px', marginBottom: '20px', boxShadow: 'var(--shadow-sm)' }}>
                                <img src={item.image} alt={item.name} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', marginRight: '20px' }} />
                                <div style={{ flex: '1' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>{item.name}</h3>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '15px' }}>{item.brand || 'BuildX'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                            <button style={{ padding: '8px 12px', background: '#f9fafb', border: 'none', cursor: 'pointer' }} onClick={() => handleQtyChange(item.id, item.qty, -1, item.stock)}>-</button>
                                            <span style={{ padding: '0 15px', fontWeight: '600' }}>{item.qty}</span>
                                            <button style={{ padding: '8px 12px', background: '#f9fafb', border: 'none', cursor: 'pointer' }} onClick={() => handleQtyChange(item.id, item.qty, 1, item.stock)}>+</button>
                                        </div>
                                        <button style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={() => handleRemove(item.id)}>
                                            <i className='bx bx-trash'></i> Remove
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                    PKR {(item.price * item.qty).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cart-summary" style={{ flex: '1', background: 'var(--surface)', padding: '30px', borderRadius: '16px', boxShadow: 'var(--shadow-md)', position: 'sticky', top: '100px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #f3f4f6' }}>Order Summary</h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-muted)' }}>
                            <span>Subtotal ({cartCount} items)</span>
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

                        {/* Promo Code Input - UI Only for Professional Feel */}
                        <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
                            <input type="text" placeholder="Enter Promo Code" style={{ flex: '1', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', outline: 'none' }} />
                            <button style={{ padding: '10px 20px', background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background = '#e5e7eb'} onMouseOut={e => e.target.style.background = '#f3f4f6'}>Apply</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '30px' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--primary)' }}>PKR {(cartTotal + 15).toLocaleString()}</span>
                        </div>

                        <button className="btn-primary" style={{ width: '100%', fontSize: '16px', fontWeight: '700', padding: '15px' }} onClick={() => navigate('/checkout')}>
                            Proceed to Checkout <i className='bx bx-right-arrow-alt' style={{ fontSize: '20px', verticalAlign: 'middle', marginLeft: '5px' }}></i>
                        </button>

                        <div style={{ marginTop: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i className='bx bx-lock-alt' ></i> Secure Checkout</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i className='bx bx-shield-quarter' ></i> Buyer Protection</div>
                        </div>

                        <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '25px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = 'var(--primary)'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>
                            <i className='bx bx-arrow-back' style={{ verticalAlign: 'middle', marginRight: '5px' }}></i> Continue Shopping
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
