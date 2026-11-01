'use client';

import { usePathname } from 'next/navigation';
import { useChatState } from '@/app/_context/ChatContext';
import { useTranslations } from 'next-intl';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import MiniVideoPlayer from '@/modules/videos/MiniVideoPlayer';
import {
  isGlobalChatOverlaySuppressed,
  normalizeAppPath,
} from './chatRouteUtils';

export default function JoinChat() {
  const pathname = usePathname();
  const { isChatOpen, setIsChatOpen } = useChatState();
  const t = useTranslations();
  // Sit above the player bar when something from the archive is playing
  const playerOpen = useGlobalStore(
    (s) =>
      (s.activePlayer === ActivePlayer.SOUNDCLOUD && !!s.trackId) ||
      (s.activePlayer === ActivePlayer.MIXCLOUD && !!s.showKey),
  );

  const tapStripOpen = useGlobalStore((s) => s.playerTapNeeded);

  const chatHidden = isGlobalChatOverlaySuppressed(normalizeAppPath(pathname));

  // Bottom right dock: the small video player (live video or a YouTube video,
  // when there is one), then the chat button. The dock stays even where the chat button is hidden.
  return (
    <div className={`fixed right-3 z-50 transition-[bottom] duration-300 ${tapStripOpen ? 'bottom-[150px]' : playerOpen ? 'bottom-[76px]' : 'bottom-3'}`}>
      {/* Wraps on phones: the open player above, the folded one beside the chat button */}
      <div className='flex max-w-[calc(100vw-1.5rem)] flex-row flex-wrap items-end justify-end gap-2'>
        <MiniVideoPlayer />
        {!chatHidden && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className='inline-flex items-center p-3 rounded-xl bg-orange-500 text-white focus:outline-none focus:ring-4 font-mono font-semibold border border-white hover:cursor-pointer hover:bg-orange-600 transition-colors duration-200 shadow-lg'
          aria-label={t('chat.open')}
        >
          <span className='hidden lg:inline'>
            {isChatOpen ? t('chat.close') : t('chat.join')}
          </span>
          <span className='lg:hidden'>{isChatOpen ? 'X' : t('chat.join')}</span>
        </button>
        )}
      </div>
    </div>
  );
}
