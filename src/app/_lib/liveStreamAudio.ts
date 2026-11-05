import {
  getLiveChannelStreamUrl,
  LIVE_CHANNELS,
  type LiveChannelId,
} from '@/app/_lib/liveChannels';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import { EVENTS, track } from '@/app/_lib/analytics';
import {
  liveFlowing,
  liveInterrupted,
  liveStalled,
  liveStarted,
  liveStopped,
  startOrigin,
  type LiveStopReason,
} from '@/app/_lib/listenTracking';
import { useCalendarStore } from '@/hooks/useCalendarStore';
import { findCurrentShow } from '@/modules/live-ticker/liveTickerUtils';
import { entryTitle } from '@/modules/timetable_v2/utils';

let audioElement: HTMLAudioElement | null = null;
let sourceElement: HTMLSourceElement | null = null;
/** We are (re)loading the stream ourselves: its pause events are not a listener stopping */
let reloading = false;

/** What is on air on a channel now (for the listening statistics). */
function showOnAir(channelId: LiveChannelId): string {
  try {
    const { ch1, ch2 } = useCalendarStore.getState();
    const entry = findCurrentShow(channelId === 2 ? ch2 : ch1);
    if (!entry) return '';
    return entry.showTitle || entryTitle(entry).title || entry.title || '';
  } catch {
    return '';
  }
}

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
  const onPause = () => {
    setLiveStreamPlaying(false);
    // Paused by the phone (locked, call) or the browser, not by our controls
    if (!reloading) liveInterrupted();
  };
  // A stream that ends or errors while playing is an interruption, not a choice
  const onError = () => {
    if (!reloading && audio.error && !audio.paused) liveStopped('error');
  };
  const onEnded = () => liveStopped('error');
  const onWaiting = () => liveStalled();
  const onPlaying = () => liveFlowing();

  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
  audio.addEventListener('error', onError);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('waiting', onWaiting);
  audio.addEventListener('stalled', onWaiting);
  audio.addEventListener('playing', onPlaying);

  return () => {
    audio.removeEventListener('play', onPlay);
    audio.removeEventListener('pause', onPause);
    audio.removeEventListener('error', onError);
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('waiting', onWaiting);
    audio.removeEventListener('stalled', onWaiting);
    audio.removeEventListener('playing', onPlaying);
  };
}

/** Stop the live stream. `why`: the listener paused, or another player / a video took over. */
export async function pauseLiveStream(why: LiveStopReason = 'pause') {
  const { setLiveStreamPlaying } = useGlobalStore.getState();
  liveStopped(why);

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

  const url = getLiveChannelStreamUrl(channelId);
  // Where the listener pressed play (before awaiting: the click is fresh now)
  const from = startOrigin('player');

  try {
    activePlayerSet(ActivePlayer.AIRTIME);

    const currentSrc = sourceElement.getAttribute('src');
    if (currentSrc !== url) {
      sourceElement.setAttribute('src', url);
    }

    reloading = true;
    try {
      await audioElement.load();
    } finally {
      reloading = false;
    }
    await audioElement.play();
    track(EVENTS.playLive(channelId === 2 ? 2 : 1));
    liveStarted(channelId === 2 ? 2 : 1, showOnAir(channelId), from);
  } catch (error) {
    reloading = false;
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
    void pauseLiveStream('switch');
  }
}
