import { useRef, forwardRef, useImperativeHandle } from 'react';
import usePlayerState from '@/hooks/usePlayerState';
import { Pause } from '@/common/assets/PauseIcon';
import { Play } from '@/common/assets/PlayIcon';

interface AudioPlayerProps {
  iconFill: string;
  iconClassName: string;
  audioSrc: string;
}

export type AudioPlayerRef = {
  pause: () => void;
};

const LivePlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ iconClassName, iconFill, audioSrc }, ref) => {
    const AUDIO_SRC = audioSrc;

    const player = useRef<HTMLAudioElement>(
      null
    ) as React.MutableRefObject<HTMLAudioElement>;
    const source = useRef<HTMLSourceElement>(
      null
    ) as React.MutableRefObject<HTMLSourceElement>;

    const { isPlaying, play, pause } = usePlayerState({
      audioRef: player,
      sourceRef: source,
      url: AUDIO_SRC,
    });

    // Expose methods to parent components via ref
    useImperativeHandle(ref, () => ({
      pause,
    }));

    return (
      <section className='flex items-center'>
        <button
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

        <audio hidden id='thfradio-live-player' preload='none' ref={player}>
          <source ref={source} type='audio/mpeg' />
          Your browser does not support the audio element.
        </audio>
      </section>
    );
  }
);

LivePlayer.displayName = 'LivePlayer';

export default LivePlayer;
