import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/components/CartProvider";
import { BrandingProvider } from "@/components/BrandingProvider";

export const metadata: Metadata = {
  title: "Online Ordering",
  description: "Order food online for pickup",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BrandingProvider>
          <CartProvider>
            {children}
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          </CartProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
