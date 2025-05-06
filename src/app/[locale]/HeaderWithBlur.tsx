'use client';

import { useState } from 'react';
import Header from '@/layout/header/Header';

export default function HeaderWithBlur({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className='relative'>
      <Header isOpen={isMobileMenuOpen} setIsOpen={setMobileMenuOpen} />
      <main className={isMobileMenuOpen ? '' : ''}>{children}</main>
    </div>
  );
}
