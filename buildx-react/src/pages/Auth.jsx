import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const Auth = () => {
    const [view, setView] = useState('email'); // 'email', 'password', 'signup'
    const [signupStep, setSignupStep] = useState(1); // 1 = Personal, 2 = Brand, 3 = Finance (For Sellers only)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [signupData, setSignupData] = useState({
        name: '', email: '', password: '', role: 'customer', brandName: '',
        city: '', address: '', cnic: '', bankAccount: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get('sell') === 'true') {
            setView('signup');
            setSignupData(prev => ({ ...prev, role: 'seller' }));
        }
    }, [searchParams]);

    const handleEmailContinue = () => {
        if (!email.trim()) return toast.error("Please enter your email.");

        // Simple regex to validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return toast.error("Please enter a valid email address (e.g., test@example.com).");
        }

        setView('password');
    };

    const handleLogin = async () => {
        if (!password) return toast.error("Please enter your password.");
        setLoading(true);

        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // If it fails, check if this is a seeded demo user in the public table
                const { data: dbUser, error: dbError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .eq('password', password)
                    .maybeSingle();

                if (dbUser && !dbError) {
                    console.log("Found legacy seeded user, migrating to Supabase Auth...");
                    // Register them silently in Auth
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            data: { name: dbUser.name, role: dbUser.role },
                            emailRedirectTo: null
                        }
                    });

                    if (signUpError) throw signUpError;

                    // We also need to map this new auth user ID effectively
                    await supabase.from('users').update({ password: 'supabase_managed' }).eq('email', email);

                    // Force login if session isn't automatically instantiated 
                    if (!signUpData.session) {
                        await supabase.auth.signInWithPassword({ email, password });
                    }

                    return; // Context will handle redirect
                }

                if (error.message.includes("Email not confirmed")) {
                    throw new Error("Please confirm your email address to continue.");
                }
                throw error;
            }
        } catch (e) {
            console.error("Supabase Login Error:", e);
            toast.error(e.message || "Invalid login credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = async (provider) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error(`${provider} Login Error:`, error.message);
            toast.error(`Could not sign in with ${provider}.`);
        } finally {
            setLoading(false);
        }
    };

    // LocalStorage fallback removed completely per strictly Supabase requirements

    const handleSignup = async () => {
        const { name, email: signupEmail, password: signupPassword, role } = signupData;

        if (!name || !signupEmail || !signupPassword) return toast.error("Please fill all required fields!");
        if (signupPassword.length < 6) return toast.error("Password must be at least 6 characters.");

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: signupEmail,
                password: signupPassword,
                options: {
                    data: { name, role },
                    emailRedirectTo: null
                }
            });
            if (error) throw error;

            await syncPublicProfile(data.user?.id);

            // Instant auto-login override for localhost/unverified behavior
            if (!data.session) {
                await supabase.auth.signInWithPassword({
                    email: signupEmail,
                    password: signupPassword
                });
            }

            toast.success("Account Created! Welcome to the Marketplace.");

            setTimeout(() => {
                if (role === 'seller') {
                    navigate('/seller');
                } else {
                    navigate('/customer');
                }
            }, 1500);
        } catch (e) {
            console.error("Supabase Signup Error:", e.message);
            toast.error(e.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const syncPublicProfile = async (userId) => {
        const { name, email: signupEmail, role, brandName, city, address, cnic, bankAccount } = signupData;
        const seller_id = role === 'seller' ? `vendor_${Date.now()}` : null;

        const { error } = await supabase
            .from('users')
            .upsert([{
                id: userId || undefined,
                email: signupEmail,
                name: name,
                role: role,
                password: 'supabase_managed',
                brand_name: brandName || null,
                city: city || null,
                address: address || null,
                cnic: cnic || null,
                bank_account: bankAccount || null,
                seller_id: seller_id
            }], { onConflict: 'email' });

        if (error) {
            console.error("Failed to sync public profile data:", error);
        }
    };

    return (
        <div className="auth-wrapper">
            {view === 'email' && (
                <div className="auth-card" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                    <div className="auth-header">
                        <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '20px' }}>
                            Build<span>X</span>
                        </div>
                        <h2>Welcome back</h2>
                        <p>Enter your email to continue</p>
                    </div>
                    <div className="form-group">
                        <input
                            type="email"
                            className="form-input"
                            placeholder="name@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={handleEmailContinue}>
                        Continue with Email <i className='bx bx-right-arrow-alt' style={{ fontSize: '20px' }}></i>
                    </button>

                    <div style={{ margin: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', position: 'relative' }}>
                        <span style={{ background: 'var(--card-bg)', padding: '0 10px', position: 'relative', zIndex: 1 }}>or continue with</span>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)', zIndex: 0 }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                        <button className="btn-outline" onClick={() => handleOAuthLogin('google')} disabled={loading} style={{ width: '100%', justifyContent: 'center', gap: '10px' }}>
                            <i className='bx bxl-google' style={{ fontSize: '20px', color: '#DB4437' }}></i> Google
                        </button>
                        <button className="btn-outline" onClick={() => handleOAuthLogin('azure')} disabled={loading} style={{ width: '100%', justifyContent: 'center', gap: '10px' }}>
                            <i className='bx bxl-microsoft' style={{ fontSize: '20px', color: '#00A4EF' }}></i> Microsoft
                        </button>
                    </div>

                    <div className="auth-switch" style={{ marginTop: '20px' }}>
                        Don&apos;t have an account? <a href="#" onClick={(e) => { e.preventDefault(); setView('signup'); }}>Sign up</a>
                    </div>
                </div>
            )}

            {view === 'password' && (
                <div className="auth-card" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                    <div className="auth-header">
                        <i className='bx bx-arrow-back'
                            style={{ position: 'absolute', left: '40px', top: '55px', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onClick={() => setView('email')}></i>
                        <h2>Verify it&apos;s you</h2>
                        <p>{email}</p>
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={handleLogin} disabled={loading}>
                        {loading ? <><i className='bx bx-loader-alt bx-spin'></i> Signing in...</> : "Sign In"}
                    </button>
                    <div className="auth-switch">
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('reset'); }}>Forgot password?</a>
                    </div>
                </div>
            )}

            {view === 'reset' && (
                <div className="auth-card" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                    <div className="auth-header">
                        <i className='bx bx-arrow-back'
                            style={{ position: 'absolute', left: '40px', top: '55px', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onClick={() => setView('password')}></i>
                        <h2>Reset Password</h2>
                        <p>We'll send a recovery link to your email</p>
                    </div>
                    <div className="form-group">
                        <input
                            type="email"
                            className="form-input"
                            placeholder="name@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={async () => {
                        if (!email) return toast.error("Please enter your email.");
                        setLoading(true);
                        try {
                            const { error } = await supabase.auth.resetPasswordForEmail(email);
                            if (error) throw error;
                            toast.success("If an account exists, a reset link has been sent to your email.");
                            setView('email');
                        } catch (err) {
                            toast.error("Since email verification is turned off locally, password resets are handled manually by the admin for now.");
                            setView('email');
                        } finally {
                            setLoading(false);
                        }
                    }} disabled={loading}>
                        {loading ? <><i className='bx bx-loader-alt bx-spin'></i> Sending...</> : "Send Reset Link"}
                    </button>
                    <div className="auth-switch">
                        Remember your password? <a href="#" onClick={(e) => { e.preventDefault(); setView('password'); }}>Sign in</a>
                    </div>
                </div>
            )}

            {view === 'signup' && (
                <div style={{ display: 'flex', gap: '30px', alignItems: 'stretch', width: signupData.role === 'seller' ? '1000px' : 'auto', maxWidth: '95vw', transition: 'width 0.3s ease' }}>

                    {/* The Promotional Panel for Sellers */}
                    {signupData.role === 'seller' && (
                        <div style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            borderRadius: '24px',
                            padding: '40px',
                            color: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            position: 'relative',
                            overflow: 'hidden',
                            animation: 'fadeIn 0.5s ease forwards'
                        }}>
                            {/* Decorative Background Elements */}
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
                            <div style={{ position: 'absolute', bottom: '-100px', left: '-50px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>

                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'inline-block', background: 'rgba(249,115,22,0.2)', color: '#f97316', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>
                                    BuildX Seller Partners
                                </div>
                                <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 20px 0', lineHeight: 1.2 }}>Sell your products to thousands across Pakistan.</h2>
                                <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px', maxWidth: '90%' }}>
                                    Join our growing network of hardware stores, lumber yards, and contractors. Expand your reach, manage orders effortlessly, and grow your local business.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontSize: '24px' }}>
                                            <i className='bx bx-store-alt'></i>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '18px' }}>500+ Active Sellers</div>
                                            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Across 15 major cities</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '24px' }}>
                                            <i className='bx bx-trending-up'></i>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '18px' }}>0% Commission</div>
                                            <div style={{ color: '#94a3b8', fontSize: '14px' }}>For your first 30 days</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '24px' }}>
                                            <i className='bx bx-shield-quarter'></i>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '18px' }}>Secure Payouts</div>
                                            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Weekly guaranteed deposits</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ position: 'relative', zIndex: 1, marginTop: '40px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontStyle: 'italic', color: '#cbd5e1', marginBottom: '15px' }}>
                                    "BuildX completely transformed our hardware shop. We went from local foot traffic to receiving orders from all over the city."
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                        MH
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Madina Tools & Hardware</div>
                                        <div style={{ color: '#64748b', fontSize: '12px' }}>Faisalabad, PK</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="auth-card" style={{ flex: signupData.role === 'seller' ? '0 0 450px' : 1, margin: 0, animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                        <div className="auth-header">
                            <h2>Join BuildX</h2>
                            <p>Select your account type to get started</p>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                            <label style={{ flex: 1, cursor: 'pointer' }}>
                                <input type="radio" value="customer" checked={signupData.role === 'customer'}
                                    onChange={() => setSignupData(p => ({ ...p, role: 'customer' }))} style={{ display: 'none' }} />
                                <div style={{
                                    padding: '15px', textAlign: 'center', borderRadius: 'var(--radius-sm)', fontWeight: 600, transition: 'all 0.3s',
                                    border: signupData.role === 'customer' ? '2px solid var(--primary)' : '2px solid #e5e7eb',
                                    color: signupData.role === 'customer' ? 'var(--primary)' : 'var(--text-muted)',
                                    background: signupData.role === 'customer' ? '#fff4ed' : 'transparent'
                                }}>Customer</div>
                            </label>
                            <label style={{ flex: 1, cursor: 'pointer' }}>
                                <input type="radio" value="seller" checked={signupData.role === 'seller'}
                                    onChange={() => setSignupData(p => ({ ...p, role: 'seller' }))} style={{ display: 'none' }} />
                                <div style={{
                                    padding: '15px', textAlign: 'center', borderRadius: 'var(--radius-sm)', fontWeight: 600, transition: 'all 0.3s',
                                    border: signupData.role === 'seller' ? '2px solid var(--primary)' : '2px solid #e5e7eb',
                                    color: signupData.role === 'seller' ? 'var(--primary)' : 'var(--text-muted)',
                                    background: signupData.role === 'seller' ? '#fff4ed' : 'transparent'
                                }}>Seller Partner</div>
                            </label>
                        </div>

                        <div className="form-group">
                            <input type="text" className="form-input" placeholder="Full Name"
                                value={signupData.name} onChange={e => setSignupData(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <input type="email" className="form-input" placeholder="Email Address"
                                value={signupData.email} onChange={e => setSignupData(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <input type="password" className="form-input" placeholder="Password (min. 6 chars)"
                                value={signupData.password} onChange={e => setSignupData(p => ({ ...p, password: e.target.value }))} />
                        </div>

                        <button className="btn-primary" onClick={handleSignup} disabled={loading} style={{ marginTop: '10px' }}>
                            {loading ? <><i className='bx bx-loader-alt bx-spin'></i> Creating...</> : "Create Account"}
                        </button>

                        <div className="auth-switch">
                            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setView('email'); }}>Sign in</a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Auth;
