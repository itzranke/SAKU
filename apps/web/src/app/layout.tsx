import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SAKU — Personal Financial Operating System',
  description: 'Institutional-grade multi-asset personal wealth and active trading management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#090D16] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
