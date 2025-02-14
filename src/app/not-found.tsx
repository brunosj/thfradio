'use client';

import Button from '@/common/ui/UIButton';

export default function NotFound() {
  return (
    <div className='bg-dark-blue min-h-screen flex items-center justify-center'>
      <div className='layout text-center '>
        <h1 className='text-6xl font-bold mb-4 text-white'>404</h1>
        <h2 className='text-2xl mb-6 text-white'>Not Found</h2>
        <div className=' flex justify-center'>
          <Button path='/' color='white-orange' ariaLabel='Back to home'>
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
