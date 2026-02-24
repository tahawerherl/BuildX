import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToCart, cart } = useCart();

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("products")
                    .select("*, users!inner(brand_name, name)")
                    .eq("id", id)
                    .single();

                if (error) {
                    throw error;
                }
                setProduct(data);
            } catch (e) {
                console.error("Supabase Error:", e.message);
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleAddToCart = (e) => {
        const cartItem = cart[product.id];
        if (cartItem && cartItem.qty >= product.stock) {
            toast.error("Requested quantity exceeds available stock.");
            return;
        }

        addToCart(product);

        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class='bx bx-check'></i> Added!`;
        btn.style.background = "#10b981"; // success green
        btn.style.boxShadow = "none";
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = "";
        }, 1500);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <i className='bx bx-loader-alt bx-spin' style={{ fontSize: '40px', color: 'var(--primary)' }}></i>
            </div>
        );
    }

    if (!product) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <h2>Product Not Found</h2>
                <button className="btn-secondary" onClick={() => navigate('/')}>Back to Catalog</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }} onClick={() => navigate('/')}>
                <i className='bx bx-arrow-back'></i> Back to Catalog
            </button>

            <div className="product-details-container responsive-flex-row" style={{ background: 'var(--surface)', padding: '40px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ flex: '1', minWidth: '300px', width: '100%' }}>
                    <img src={product.image} alt={product.name} style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', height: 'auto', border: '1px solid #f3f4f6' }} />
                </div>
                <div style={{ flex: '1' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1px', marginBottom: '10px' }}>
                        Sold by: {product.users?.brand_name || product.users?.name || 'BuildX Partner'}
                        {product.brand ? ` | Brand: ${product.brand}` : ''}
                    </div>
                    <h1 style={{ fontSize: '32px', color: 'var(--text-dark)', marginBottom: '15px', fontWeight: '700' }}>{product.name}</h1>
                    <div style={{ fontSize: '28px', color: 'var(--text-dark)', fontWeight: '600', marginBottom: '15px' }}>PKR {product.price.toLocaleString()}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <i className='bx bxs-truck' style={{ fontSize: '20px', color: 'var(--primary)' }}></i> FREE Delivery by Tomorrow
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                        <button className="btn-primary" style={{ flex: '2', padding: '16px', fontSize: '16px' }} onClick={handleAddToCart}>
                            <i className='bx bx-cart-add'></i> Add to Cart
                        </button>
                    </div>

                    <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        <h3 style={{ color: 'var(--text-dark)', marginBottom: '10px' }}>Product Features</h3>
                        <p>{product.description || 'Premium build quality and reliable performance. Essential for any workspace.'}</p>
                        <div style={{ marginTop: '15px' }}>
                            <div><strong>Stock Availability:</strong> {product.stock > 0 ? `${product.stock} units` : <span style={{ color: 'red' }}>Out of Stock</span>}</div>
                            <div><strong>Category:</strong> {product.category || 'General'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
