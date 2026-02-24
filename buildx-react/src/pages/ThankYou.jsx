import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ThankYou = () => {
    const { currentUser } = useAuth();

    return (
        <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px' }}>
            <div style={{ background: 'var(--surface)', padding: '50px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', boxShadow: '0 10px 20px rgba(249, 99, 2, 0.2)' }}>
                    <i className='bx bx-check' style={{ fontSize: '48px', color: '#fff' }}></i>
                </div>

                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '15px', color: 'var(--text-dark)' }}>
                    Order Confirmed!
                </h1>

                <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '30px', lineHeight: '1.6' }}>
                    Thanks for shopping with BuildX! Your order has been successfully placed.<br />
                    We&#39;ll send you a confirmation email with your tracking details shortly.
                </p>

                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '16px', marginBottom: '35px', display: 'inline-block', textAlign: 'left' }}>
                    <div style={{ display: 'flex', gap: '40px' }}>
                        <div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Date</div>
                            <strong style={{ color: 'var(--text-dark)' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                        </div>
                        {currentUser && (
                            <div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Tracking</div>
                                <Link to="/orders" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Track Order <i className='bx bx-right-arrow-alt'></i></Link>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    {currentUser && (
                        <Link to="/orders" className="btn-secondary" style={{ width: 'auto', padding: '14px 28px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className='bx bx-package'></i> View Orders
                        </Link>
                    )}
                    <Link to="/" className="btn-primary" style={{ width: 'auto', padding: '14px 28px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className='bx bx-store'></i> Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ThankYou;
