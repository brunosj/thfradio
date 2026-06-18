import { useRef, forwardRef, useImperativeHandle } from 'react';
import usePlayerState from '@/hooks/usePlayerState';
import type { LiveChannelId } from '@/app/_lib/liveChannels';
import { Pause } from '@/common/assets/PauseIcon';
import { Play } from '@/common/assets/PlayIcon';

interface AudioPlayerProps {
  iconFill: string;
  iconClassName: string;
  audioSrc: string;
  channelId?: LiveChannelId;
}

export type AudioPlayerRef = {
  pause: () => void;
};

const LivePlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ iconClassName, iconFill, audioSrc, channelId }, ref) => {
    const player = useRef<HTMLAudioElement>(
      null,
    ) as React.MutableRefObject<HTMLAudioElement>;
    const source = useRef<HTMLSourceElement>(
      null,
    ) as React.MutableRefObject<HTMLSourceElement>;

    const { isPlaying, play, pause } = usePlayerState({
      audioRef: player,
      sourceRef: source,
      url: audioSrc,
      channelId,
    });

    useImperativeHandle(ref, () => ({
      pause: () => {
        void pause();
      },
    }));

    const audioId =
      channelId !== undefined
        ? `thfradio-live-player-${channelId}`
        : 'thfradio-live-player';

    return (
      <section className='flex items-center'>
        <button
          type='button'
          className='cursor-pointer'
          onClick={isPlaying ? pause : play}
          aria-label={
            isPlaying ? 'Pause Live Broadcast' : 'Play Live Broadcast'
          }
        >
          {isPlaying ? (
            <Pause className={iconClassName} fill={iconFill} />
          ) : (
            <Play className={iconClassName} fill={iconFill} />
          )}
        </button>

        <audio hidden id={audioId} preload='none' ref={player}>
          <source ref={source} type='audio/mpeg' />
          Your browser does not support the audio element.
        </audio>
      </section>
    );
  },
);

LivePlayer.displayName = 'LivePlayer';

export default LivePlayer;
