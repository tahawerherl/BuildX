import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
    const { currentUser } = useAuth();
    const { cartCount } = useCart();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleSearch = (e) => {
        const q = e.target.value;
        if (q) {
            navigate(`/?q=${encodeURIComponent(q)}`);
        } else {
            navigate('/');
        }
    };

    return (
        <header className="main-header glass">
            <Link to="/" className="logo-container" style={{ textDecoration: 'none' }}>
                Build<span>X</span>
            </Link>

            <div className="search-wrapper">
                <i className='bx bx-search search-icon'></i>
                <input
                    type="text"
                    placeholder="Search for tools, paint, hardware..."
                    defaultValue={searchParams.get('q') || ''}
                    onChange={handleSearch}
                />
                <button className="search-btn">Search</button>
            </div>

            <div className="nav-actions">
                {currentUser ? (
                    <Link to={currentUser.role === 'seller' ? "/seller" : "/customer"} className="nav-btn" id="accountNav">
                        <i className='bx bx-user'></i>
                        <span>{currentUser.name.split(" ")[0]}</span>
                    </Link>
                ) : (
                    <Link to="/auth" className="nav-btn" id="accountNav">
                        <i className='bx bx-user'></i>
                        <span>Sign In</span>
                    </Link>
                )}
                <Link to="/orders" className="nav-btn">
                    <i className='bx bx-package'></i>
                    <span>Orders</span>
                </Link>
                <Link to="/cart" className="nav-btn">
                    <i className='bx bx-cart-alt'></i>
                    <span>Cart</span>
                    <div className="cart-badge" id="cartCountBadge">{cartCount}</div>
                </Link>
            </div>
        </header>
    );
};

export default Navbar;
