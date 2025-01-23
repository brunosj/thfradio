'use client';

import { useState } from 'react';
import Header from '@/layout/header/Header';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className='relative'>
      <Header isOpen={isMobileMenuOpen} setIsOpen={setMobileMenuOpen} />
      <main
        className={
          isMobileMenuOpen ? 'filter blur-sm duration-700 ease-in-out' : ''
        }
      >
        {children}
      </main>
    </div>
  );
}
