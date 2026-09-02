import type {Metadata} from 'next';
import './globals.css';
import { CartProvider } from '@/lib/context/CartContext';
import { FloatingActions } from '@/components/floating/FloatingActions';

export const metadata: Metadata = {
  title: 'Portal Profesional Steffen | Venta Directa a Salones',
  description: 'Plataforma oficial B2B de Steffen Cosmética Capilar para peluquerías y salones profesionales.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className="overflow-x-hidden">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased font-sans overflow-x-hidden" suppressHydrationWarning>
        <CartProvider>
          {children}
          <FloatingActions />
        </CartProvider>
      </body>
    </html>
  );
}
