import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '家计簿',
  description: '家庭记账工具',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full">
        <AuthProvider>
          <AppProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
