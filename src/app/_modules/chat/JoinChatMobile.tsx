import { Link } from '@/i18n/routing';

export default function JoinChatMobile() {
  return (
    <div className='pb-5 pt-2'>
      <button className='inline-flex items-center p-3 rounded-xl bg-orange-500 text-white focus:outline-none focus:ring-4 font-mono font-semibold border border-white'>
        <Link href='/chat' target='_blank'>
          Join the chat!
        </Link>
      </button>
    </div>
  );
}
