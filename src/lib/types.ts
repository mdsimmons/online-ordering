export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: {
    id: string;
    name: string;
    price: number;
  }[];
}

export interface Cart {
  items: CartItem[];
  notes: string;
}

export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderWithItems {
  id: string;
  customerName: string;
  email: string | null;
  phone: string;
  notes: string | null;
  status: OrderStatus;
  estimatedTime: string | null;
  total: number;
  createdAt: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    modifiers: {
      name: string;
      price: number;
    }[];
  }[];
}
