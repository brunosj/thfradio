'use client';

import Link from 'next/link';
import { TbBrandDiscord } from 'react-icons/tb';
import DiscordEmbed from '@/modules/chat/DiscordEmbed';

export default function ChatContent() {
  return (
    <div className='relative pt-6'>
      <div className='absolute left-0 w-full bg-orange-500 text-white h-[63px] px-4'>
        <div className='flex space-x-4 items-center h-full'>
          <span className='flex-grow'>
            <Link href='/'>THF Radio</Link>
          </span>
          <TbBrandDiscord className='w-6 h-6' />
        </div>
      </div>
      <div className='pt-[5.6rem] h-screen w-[full] bg-[#303236]'>
        <DiscordEmbed />
      </div>
    </div>
  );
}
