import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ThankYou from './pages/ThankYou';
import Orders from './pages/Orders';
import SellerDashboard from './pages/SellerDashboard';
import CustomerDashboard from './pages/CustomerDashboard';

function App() {
  const { loading, currentUser } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <i className='bx bx-loader-alt bx-spin' style={{ fontSize: '40px', color: 'var(--primary)' }}></i>
    </div>;
  }

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#333',
          color: '#fff',
          fontFamily: "'Outfit', sans-serif"
        },
      }}
      />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={currentUser ? <Navigate to={currentUser.role === 'seller' ? "/seller" : "/customer"} /> : <Auth />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/orders" element={currentUser ? <Orders /> : <Navigate to="/auth" />} />
        <Route path="/seller" element={currentUser?.role === 'seller' ? <SellerDashboard /> : <Navigate to="/auth" />} />
        <Route path="/customer" element={currentUser?.role === 'customer' ? <CustomerDashboard /> : <Navigate to="/auth" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
