export const dynamic = 'force-dynamic';

// Last-resort 404 outside /en and /de. It has no language context, so it must not use
// the site's i18n Button/Link (that crashed it into a 500) – a plain link is enough.
export default function NotFound() {
  return (
    <div className='bg-dark-blue min-h-screen flex items-center justify-center'>
      <div className='layout text-center '>
        <h1 className='text-6xl font-bold mb-4 text-white'>404</h1>
        <h2 className='text-2xl mb-6 text-white'>Not Found</h2>
        <div className=' flex justify-center'>
          <a
            href='/en'
            aria-label='Back to home'
            className='rounded-xl border-2 border-white px-4 py-2 text-white hover:bg-orange-500 hover:border-orange-500'
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
