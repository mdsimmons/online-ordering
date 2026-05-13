"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import type { CartItem, Cart } from "@/lib/types";

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "SET_NOTES"; payload: string }
  | { type: "CLEAR_CART" };

interface CartContextValue {
  cart: Cart;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) =>
          i.menuItemId === action.payload.menuItemId &&
          JSON.stringify(i.modifiers) === JSON.stringify(action.payload.modifiers)
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + action.payload.quantity } : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.id !== action.payload) };
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items
          .map((i) => (i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i))
          .filter((i) => i.quantity > 0),
      };
    case "SET_NOTES":
      return { ...state, notes: action.payload };
    case "CLEAR_CART":
      return { items: [], notes: "" };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, { items: [], notes: "" });

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.items?.forEach((item: CartItem) =>
          dispatch({ type: "ADD_ITEM", payload: item })
        );
        if (parsed.notes) dispatch({ type: "SET_NOTES", payload: parsed.notes });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addItem = (item: CartItem) => dispatch({ type: "ADD_ITEM", payload: item });
  const removeItem = (id: string) => dispatch({ type: "REMOVE_ITEM", payload: id });
  const updateQuantity = (id: string, quantity: number) =>
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
  const setNotes = (notes: string) => dispatch({ type: "SET_NOTES", payload: notes });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const total = cart.items.reduce(
    (sum, i) => sum + (i.price + i.modifiers.reduce((ms, m) => ms + m.price, 0)) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ cart, addItem, removeItem, updateQuantity, setNotes, clearCart, itemCount, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
