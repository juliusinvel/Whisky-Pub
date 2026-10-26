import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// O carrinho fica no navegador. Preços aqui são só uma prévia:
// o backend recalcula tudo no checkout (/orders/quote e /orders).
const CART_KEY = 'whiskypub.cart';
const CartContext = createContext(null);

function load() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => {
    const setQuantity = (productId, quantity) =>
      setItems((list) =>
        list
          .map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i))
          .filter((i) => i.quantity > 0),
      );

    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + Number(i.price) * i.quantity, 0),

      add(product, quantity = 1) {
        setItems((list) => {
          const existing = list.find((i) => i.productId === product.id);
          if (existing) {
            return list.map((i) =>
              i.productId === product.id
                ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock), stock: product.stock }
                : i,
            );
          }
          return [
            ...list,
            {
              productId: product.id,
              name: product.name,
              brand: product.brand,
              price: product.price,
              imageUrl: product.imageUrl,
              stock: product.stock,
              quantity: Math.min(quantity, product.stock),
            },
          ];
        });
      },
      setQuantity,
      remove: (productId) => setQuantity(productId, 0),
      clear: () => setItems([]),
      /** Ajusta o carrinho com os dados atuais devolvidos pelo backend */
      syncWithQuote(quote) {
        const byId = new Map(quote.items.map((q) => [q.productId, q]));
        setItems((list) =>
          list
            .filter((i) => byId.has(i.productId))
            .map((i) => {
              const q = byId.get(i.productId);
              return { ...i, price: q.unitPrice, stock: q.stock, quantity: Math.min(i.quantity, q.stock) };
            })
            .filter((i) => i.quantity > 0),
        );
      },
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
