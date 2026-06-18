import {
  getLiveChannelStreamUrl,
  type LiveChannelId,
} from '@/app/_lib/liveChannels';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';

let audioElement: HTMLAudioElement | null = null;
let sourceElement: HTMLSourceElement | null = null;

export function registerLiveStreamElements(
  audio: HTMLAudioElement,
  source: HTMLSourceElement,
) {
  audioElement = audio;
  sourceElement = source;
}

export function bindLiveStreamAudioEvents(audio: HTMLAudioElement) {
  const setLiveStreamPlaying = useGlobalStore.getState().setLiveStreamPlaying;

  const onPlay = () => setLiveStreamPlaying(true);
  const onPause = () => setLiveStreamPlaying(false);

  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);

  return () => {
    audio.removeEventListener('play', onPlay);
    audio.removeEventListener('pause', onPause);
  };
}

export async function pauseLiveStream() {
  const { setLiveStreamPlaying } = useGlobalStore.getState();

  try {
    setLiveStreamPlaying(false);
    // Clear src so the next play reconnects to the live stream endpoint.
    sourceElement?.setAttribute('src', '');
    audioElement?.pause();
  } catch (error) {
    setLiveStreamPlaying(false);
    console.error(error);
  }
}

export async function playLiveStream(channelId: LiveChannelId) {
  const { setActiveStreamChannel, activePlayerSet } = useGlobalStore.getState();

  if (!audioElement || !sourceElement) return;

  setActiveStreamChannel(channelId);

  const url = getLiveChannelStreamUrl(channelId);

  try {
    activePlayerSet(ActivePlayer.AIRTIME);

    const currentSrc = sourceElement.getAttribute('src');
    if (currentSrc !== url) {
      sourceElement.setAttribute('src', url);
    }

    await audioElement.load();
    await audioElement.play();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }
    useGlobalStore.getState().setLiveStreamPlaying(false);
    console.error(error);
  }
}

export async function toggleLiveStream(channelId: LiveChannelId) {
  const { liveStreamPlaying, activeStreamChannel } = useGlobalStore.getState();

  if (liveStreamPlaying && activeStreamChannel === channelId) {
    await pauseLiveStream();
    return;
  }

  await playLiveStream(channelId);
}

export function pauseLiveStreamIfOtherPlayerActive() {
  const { activePlayer } = useGlobalStore.getState();

  if (
    activePlayer === ActivePlayer.MIXCLOUD ||
    activePlayer === ActivePlayer.SOUNDCLOUD
  ) {
    void pauseLiveStream();
  }
}
