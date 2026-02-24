import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Checking Supabase Session
        let mounted = true;

        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session?.user && mounted) {
                    await initUser(session.user);
                } else if (mounted) {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Session check failed", err);
                if (mounted) setLoading(false);
            }
        };

        checkSession();

        // Listen for Auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                await initUser(session.user);
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const initUser = async (authUser) => {
        try {
            const email = authUser.email;

            // Fetch complete user profile from our public `users` table
            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (error) throw error;

            if (userData) {
                setCurrentUser(userData);
            } else {
                // If user auth exists but no public profile (e.g., initial signup delay), use basic info
                setCurrentUser({
                    email,
                    name: authUser.user_metadata?.name || 'User',
                    role: authUser.user_metadata?.role || 'customer'
                });
            }
        } catch (err) {
            console.error('Error init user', err);
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    return (
        <AuthContext.Provider value={{ currentUser, setCurrentUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
