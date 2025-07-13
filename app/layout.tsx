// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'IN:VERSION messages',
  description: 'QR-портал для футболок',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-6NigDaJj5dQZ4o9KnuYv+pO7TdF76NriwkYJp9JHAJti9j6ICSV6QfGEuqPQT6ux/YjQ+msryqRxmmqeaJ0RA==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body style={{ margin: 0, background: '#000', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
