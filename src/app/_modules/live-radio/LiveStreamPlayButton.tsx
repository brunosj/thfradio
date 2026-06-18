import { Pause } from '@/common/assets/PauseIcon';
import { Play } from '@/common/assets/PlayIcon';

type LiveStreamPlayButtonProps = {
  isPlaying: boolean;
  onToggle: () => void;
  iconClassName: string;
  iconFill: string;
};

export default function LiveStreamPlayButton({
  isPlaying,
  onToggle,
  iconClassName,
  iconFill,
}: LiveStreamPlayButtonProps) {
  return (
    <section className='flex items-center'>
      <button
        type='button'
        className='cursor-pointer'
        onClick={onToggle}
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
    </section>
  );
}
