import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useCart } from '../context/CartContext';

const SEED_PRODUCTS = [
    { id: 1, name: "Premium Drill 20V", price: 4500, stock: 10, image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500", brand: "BuildX Pro" },
    { id: 2, name: "Wall Paint White 5L", price: 1200, stock: 50, image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500", brand: "ColorMaster" },
    { id: 3, name: "Hammer Heavy Duty", price: 800, stock: 25, image: "https://static.vecteezy.com/system/resources/previews/000/528/739/original/hammer-vector-icon.jpg", brand: "BuildX Base" },
    { id: 4, name: "ToolKit 50 Pcs", price: 5500, stock: 5, image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500", brand: "FixIt All" },
    { id: 5, name: "Extension Board 5M", price: 600, stock: 100, image: "https://images.unsplash.com/photo-1558442074-3c19857bc1dc?w=500", brand: "ElecPro" }
];

const Home = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [searchParams] = useSearchParams();
    const { addToCart, cart } = useCart();
    const navigate = useNavigate();

    const searchQuery = searchParams.get('q') || '';

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            try {
                // Fetch products along with associated seller's brand name from users table
                const { data, error } = await supabase
                    .from('products')
                    .select('*, users!inner(brand_name, name)')
                    .order('id', { ascending: false });

                if (error) throw error;

                setProducts(data || []);
            } catch (err) {
                console.error("Supabase load error:", err.message);
                setProducts([]); // No unverified fallback data allowed
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleQuickAdd = (e, product) => {
        e.stopPropagation();
        const cartItem = cart[product.id];
        if (cartItem && cartItem.qty >= product.stock) {
            alert("Requested quantity exceeds available stock.");
            return;
        }

        addToCart(product);

        // Button animation feedback
        const btn = e.currentTarget;
        const ogHtml = btn.innerHTML;
        btn.innerHTML = `<i class='bx bx-check'></i> Added`;
        btn.style.background = "#10b981";
        btn.style.boxShadow = "none";
        setTimeout(() => {
            btn.innerHTML = ogHtml;
            btn.style.background = "";
        }, 1500);
    };

    return (
        <main>
            {!searchQuery && (
                <>
                    <section className="hero-banner">
                        <div className="hero-content">
                            <h1>Build Your <span className="text-gradient">Dream Space</span></h1>
                            <p>Discover top-tier materials, tools, and hardware with exclusive next-day delivery on all premium orders.</p>
                            <a href="#shop" className="hero-btn">Explore Collection</a>
                        </div>
                    </section>

                    <h2 className="section-title"><i className='bx bx-category' style={{ color: 'var(--primary)' }}></i> Top Categories</h2>
                    <div className="horizontal-scroll" style={{ marginBottom: '20px' }}>
                        <div className="scroll-item" style={{ background: '#fff4ed', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/?q=Power Tools')}>
                            <i className='bx bx-wrench' style={{ fontSize: '40px', color: 'var(--primary)', marginBottom: '10px' }}></i>
                            <h3 style={{ fontSize: '16px' }}>Power Tools</h3>
                        </div>
                        <div className="scroll-item" style={{ background: '#f3f4f6', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/?q=Paint')}>
                            <i className='bx bx-paint-roll' style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '10px' }}></i>
                            <h3 style={{ fontSize: '16px' }}>Paint & Decor</h3>
                        </div>
                        <div className="scroll-item" style={{ background: '#f3f4f6', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/?q=Lighting')}>
                            <i className='bx bx-bulb' style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '10px' }}></i>
                            <h3 style={{ fontSize: '16px' }}>Lighting</h3>
                        </div>
                        <div className="scroll-item" style={{ background: '#f3f4f6', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/?q=Safety')}>
                            <i className='bx bx-hard-hat' style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '10px' }}></i>
                            <h3 style={{ fontSize: '16px' }}>Safety Gear</h3>
                        </div>
                        <div className="scroll-item" style={{ background: '#f3f4f6', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/?q=Building')}>
                            <i className='bx bx-building-house' style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '10px' }}></i>
                            <h3 style={{ fontSize: '16px' }}>Building Materials</h3>
                        </div>
                    </div>
                </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="section-title" id="shop" style={{ margin: 0 }}>
                    {searchQuery ? (
                        <><i className='bx bx-search' style={{ color: 'var(--primary)' }}></i> Search Results for &quot;{searchQuery}&quot;</>
                    ) : (
                        <><i className='bx bx-trending-up' style={{ color: 'var(--primary)' }}></i> Trending Products</>
                    )}
                </h2>

                <div style={{ display: 'flex', gap: '10px', background: 'var(--card-bg)', padding: '5px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{ background: viewMode === 'grid' ? '#f3f4f6' : 'transparent', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <i className='bx bx-grid-alt' style={{ fontSize: '20px' }}></i>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ background: viewMode === 'list' ? '#f3f4f6' : 'transparent', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <i className='bx bx-list-ul' style={{ fontSize: '20px' }}></i>
                    </button>
                </div>
            </div>

            <div className={viewMode === 'grid' ? "product-grid" : "product-list-view"} id="productGrid" style={viewMode === 'list' ? { display: 'flex', flexDirection: 'column', gap: '15px' } : {}}>
                {loading ? (
                    <div style={{ textAlign: 'center', width: '100%', padding: '50px', gridColumn: '1 / -1' }}>
                        <i className='bx bx-loader-alt bx-spin' style={{ fontSize: '40px', color: 'var(--primary)' }}></i>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>No products found.</div>
                ) : (
                    filteredProducts.map(p => (
                        <div key={p.id}
                            className="product-card"
                            onClick={() => navigate(`/product/${p.id}`)}
                            style={viewMode === 'list' ? {
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '15px',
                                gap: '20px',
                                textAlign: 'left'
                            } : {}}>

                            <div style={viewMode === 'list' ? { display: 'flex', alignItems: 'center', gap: '20px', flex: 1 } : {}}>
                                <img src={p.image} alt={p.name} className="product-img" style={viewMode === 'list' ? { width: '80px', height: '80px', marginBottom: 0 } : {}} />
                                <div>
                                    <div className="product-brand" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                        Sold by: {p.users?.brand_name || p.users?.name || 'BuildX Partner'}
                                        {p.brand ? ` | Brand: ${p.brand}` : ''}
                                    </div>
                                    <div className="product-title" style={viewMode === 'list' ? { fontSize: '18px', marginBottom: '5px' } : {}}>{p.name}</div>
                                    {viewMode === 'list' && p.description && (
                                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {Array.isArray(p.description) ? p.description[0] : p.description}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={viewMode === 'list' ? { textAlign: 'right', minWidth: '150px' } : {}}>
                                <div className="product-price" style={viewMode === 'list' ? { fontSize: '20px', marginBottom: '10px' } : {}}>PKR {p.price.toLocaleString()}</div>
                                <div className="add-btn" style={viewMode === 'list' ? { position: 'static', opacity: 1, padding: 0 } : {}}>
                                    <button className="btn-primary" onClick={(e) => handleQuickAdd(e, p)}>
                                        <i className='bx bx-cart-add'></i> Quick Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </main>
    );
};

export default Home;
