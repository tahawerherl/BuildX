import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState({});

    // Removed localStorage sync per STRICT "No LocalStorage" rule
    // Using pure React State (volatile)

    const saveCart = (newCart) => {
        setCart(newCart);
    };

    const addToCart = (product) => {
        const newCart = { ...cart };
        if (newCart[product.id]) {
            newCart[product.id].qty += 1;
        } else {
            newCart[product.id] = { ...product, qty: 1 };
        }
        saveCart(newCart);
    };

    const updateQty = (id, newQty) => {
        const newCart = { ...cart };
        if (newQty <= 0) {
            delete newCart[id];
        } else {
            if (newCart[id]) newCart[id].qty = newQty;
        }
        saveCart(newCart);
    };

    const clearCart = () => {
        saveCart({});
    };

    const cartCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, updateQty, clearCart, cartCount, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
