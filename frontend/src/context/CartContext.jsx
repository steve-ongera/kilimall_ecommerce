import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], total: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const { data } = await cartAPI.get();
      setCart(data);
    } catch {}
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId, quantity = 1, variantId = null) => {
    setLoading(true);
    try {
      const payload = { product_id: productId, quantity };
      if (variantId) payload.variant_id = variantId;
      const { data } = await cartAPI.add(payload);
      setCart(data);
      return true;
    } catch (err) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (itemId, quantity) => {
    const { data } = await cartAPI.update(itemId, { quantity });
    setCart(data);
  };

  const removeItem = async (itemId) => {
    const { data } = await cartAPI.remove(itemId);
    setCart(data);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, updateItem, removeItem, fetchCart, loading }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);