'use client';

import { useState } from 'react';

import DiscordEmbed from './DiscordEmbed';
import { XMarkIcon } from '@/common/assets/XMarkIcon';
import { TbBrandDiscord } from 'react-icons/tb';

export default function JoinChat() {
  return (
    <div className='fixed bottom-2  right-2 hidden lg:block z-50'>
      <ChatRoom />
    </div>
  );
}

const ChatRoom = () => {
  const [openChat, setOpenChat] = useState<boolean>(false);
  if (openChat) {
    return (
      <div className='relative z-50'>
        <div className='absolute top-0 left-0 w-full bg-orange-500 text-white h-[50px] rounded-t-xl px-4 cursor-pointer'>
          <div className='flex space-x-4 items-center h-full'>
            <span className=' flex-grow '>THF Radio Chat</span>
            <TbBrandDiscord className='w-6 h-6' />
            <button onClick={() => setOpenChat(false)}>
              <XMarkIcon />
            </button>
          </div>
        </div>
        <div className=' pt-12 h-[650px] w-[350px]'>
          <DiscordEmbed />
        </div>
      </div>
    );
  } else {
    return (
      <button
        onClick={() => setOpenChat(true)}
        className='inline-flex items-center p-3 rounded-xl bg-orange-500 text-white focus:outline-none focus:ring-4 font-mono font-semibold border border-white hover:cursor-pointer hover:scale-105 duration-300 animate-bounce'
      >
        <span className='hidden lg:inline '>Join the chat!</span>
      </button>
    );
  }
};
