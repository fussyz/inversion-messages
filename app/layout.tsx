// app/layout.tsx
import './globals.css';        // если у тебя есть Tailwind или свои стили, иначе строку можно убрать
import type { ReactNode } from 'react';

export const metadata = {
  title: 'IN:VERSION messages',
  description: 'QR-портал для футболок',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#000', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
