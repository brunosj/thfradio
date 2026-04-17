'use client';

import { usePathname } from 'next/navigation';
import { useChatState } from '@/app/_context/ChatContext';
import { useTranslations } from 'next-intl';
import {
  isGlobalChatOverlaySuppressed,
  normalizeAppPath,
} from './chatRouteUtils';

export default function JoinChat() {
  const pathname = usePathname();
  const { isChatOpen, setIsChatOpen } = useChatState();
  const t = useTranslations();

  if (isGlobalChatOverlaySuppressed(normalizeAppPath(pathname))) {
    return null;
  }

  return (
    <div className='fixed bottom-2 right-2 z-50'>
      <div className='flex flex-col items-end gap-2'>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className='inline-flex items-center p-3 rounded-xl bg-orange-500 text-white focus:outline-none focus:ring-4 font-mono font-semibold border border-white hover:cursor-pointer hover:scale-105 duration-300 animate-bounce'
          aria-label={t('chat.open')}
        >
          <span className='hidden lg:inline'>
            {isChatOpen ? t('chat.close') : t('chat.join')}
          </span>
          <span className='lg:hidden'>{isChatOpen ? 'X' : t('chat.join')}</span>
        </button>
      </div>
    </div>
  );
}
