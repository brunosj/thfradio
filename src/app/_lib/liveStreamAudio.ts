import {
  getLiveChannelStreamUrl,
  LIVE_CHANNELS,
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

/**
 * Stream URL for one listen. radiocult sends Safari / iPhone browsers through
 * a redirect to plain http (blocked on our https site) unless the URL already
 * carries its `_ic2` marker, so we add it ourselves; the time also makes sure
 * a restart gets the live sound, not old buffered audio.
 */
function freshStreamUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('radiocult.fm')) {
      u.searchParams.set('_ic2', String(Date.now()));
      return u.toString();
    }
  } catch {
    // not a full URL: use as is
  }
  return url;
}

/** Lock screen / media keys while live radio plays. */
function setLiveMediaSession(channelId: LiveChannelId) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: `THF Radio · ${LIVE_CHANNELS[channelId].label} live`,
      artist: 'THF Radio Berlin',
      artwork: [{ src: '/thfradio_seo.jpg', sizes: '1200x630', type: 'image/jpeg' }],
    });
    ms.setActionHandler('play', () => void playLiveStream(channelId));
    ms.setActionHandler('pause', () => void pauseLiveStream());
    // Live has no position: no seeking
    for (const action of ['seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]) {
      ms.setActionHandler(action, null);
    }
  } catch {
    // older browsers
  }
}

export async function playLiveStream(channelId: LiveChannelId) {
  const { setActiveStreamChannel, activePlayerSet } = useGlobalStore.getState();

  if (!audioElement || !sourceElement) return;

  setActiveStreamChannel(channelId);
  setLiveMediaSession(channelId);

  const url = freshStreamUrl(getLiveChannelStreamUrl(channelId));

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
