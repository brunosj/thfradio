'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AudioPlayer, AudioPlayerRef } from 'react-audio-play';
import { ActivePlayer, useGlobalStore } from '@/hooks/useStore';
import BarsSpinner from '@/common/ui/BarsSpinner';
import Image from 'next/image';
import { Play } from '@/common/assets/PlayIcon';
import { Pause } from '@/common/assets/PauseIcon';
import { getShowName } from '@/utils/showUtils';
import type { CloudShowTypes } from '@/types/ResponsesInterface';
import MixcloudWidget from '@/modules/mixcloud/MixcloudWidget';

// Default placeholder image
const DEFAULT_IMAGE = '/images/placeholder.svg';

export default function CustomAudioPlayer() {
  console.log('CustomAudioPlayer rendering');

  const activePlayer = useGlobalStore((state) => state.activePlayer);
  const trackId = useGlobalStore((state) => state.trackId);
  const currentShowUrl = useGlobalStore((state) => state.currentShowUrl);
  const resetPlayer = useGlobalStore((state) => state.resetPlayer);

  console.log('Player state:', { activePlayer, trackId, currentShowUrl });

  const [audioUrl, setAudioUrl] = useState<string>('');
  const [widgetUrl, setWidgetUrl] = useState<string>('');
  const [streamFormat, setStreamFormat] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentShow, setCurrentShow] = useState<CloudShowTypes | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(DEFAULT_IMAGE);
  const [showTitle, setShowTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [useWidget, setUseWidget] = useState(false);
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);

  // Use the correct type from the library
  const audioRef = useRef<AudioPlayerRef>(null);

  // Function to close the player
  const handleClose = () => {
    console.log('Closing player');
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // Reset the player state in the global store
    resetPlayer();
  };

  // Function to fetch audio URL for Soundcloud
  const fetchSoundcloudAudio = useCallback(async () => {
    if (!trackId) {
      console.log('No trackId provided for Soundcloud');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUseWidget(false);
    setAvailableFormats([]);

    try {
      console.log('Fetching Soundcloud stream for trackId:', trackId);
      const response = await fetch(`/api/soundcloud-stream?trackId=${trackId}`);

      console.log('Soundcloud stream response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Soundcloud stream data:', data);

        // Save available formats for debugging
        if (data.availableFormats && Array.isArray(data.availableFormats)) {
          setAvailableFormats(data.availableFormats);
        }

        // Save widget URL for fallback
        if (data.widgetUrl) {
          setWidgetUrl(data.widgetUrl);
        }

        // Check if there's an error but we have a widget URL
        if (data.error && data.widgetUrl) {
          console.log('Stream error with widget fallback:', data.error);
          setError(data.error);
          setUseWidget(true);

          // Update show title and image if available
          if (data.title) {
            setShowTitle(data.title);
          }
          if (data.artwork_url) {
            const highResArtwork = data.artwork_url.replace(
              '-large',
              '-t500x500'
            );
            setImageSrc(highResArtwork);
          }

          setIsLoading(false);
          return;
        }

        // Check for streamUrl in the response
        if (data.streamUrl) {
          console.log(
            `Setting audio URL (${data.streamFormat}):`,
            data.streamUrl
          );
          setAudioUrl(data.streamUrl);
          setStreamFormat(data.streamFormat || '');

          // If the data was from cache, log it
          if (data.cached) {
            console.log(
              'Using cached stream data',
              data.expired ? '(expired)' : ''
            );
          }
        } else {
          console.error('No stream URL in response:', data);
          setError('No stream URL available');

          // If we have a widget URL, use it
          if (data.widgetUrl) {
            setUseWidget(true);
          }
        }

        // Update show title if available
        if (data.title) {
          setShowTitle(data.title);
        }

        // Update image if available
        if (data.artwork_url) {
          // Get high-resolution artwork
          const highResArtwork = data.artwork_url.replace(
            '-large',
            '-t500x500'
          );
          setImageSrc(highResArtwork);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch Soundcloud stream:', errorText);
        setError(`Failed to fetch stream: ${response.status}`);

        // If we have a widget URL, use it as fallback
        if (widgetUrl) {
          setUseWidget(true);
        }
      }
    } catch (error) {
      console.error('Error fetching Soundcloud audio:', error);
      setError('Error fetching audio');

      // If we have a widget URL, use it as fallback
      if (widgetUrl) {
        setUseWidget(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [trackId, widgetUrl]);

  // Function to fetch show details for Soundcloud
  const fetchShowDetails = useCallback(async () => {
    if (!currentShowUrl || !trackId) {
      console.log('No current show URL or trackId for Soundcloud');
      return;
    }

    try {
      console.log('Fetching Soundcloud show details for URL:', currentShowUrl);
      const encodedUrl = encodeURIComponent(currentShowUrl);
      console.log('Encoded URL:', encodedUrl);

      const response = await fetch(`/api/show-details?url=${encodedUrl}`);

      console.log('Show details response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Soundcloud show details:', data);

        if (data.show) {
          setCurrentShow(data.show);

          // Update image source if available
          if (data.show?.pictures?.extra_large) {
            setImageSrc(data.show.pictures.extra_large);
          } else {
            // Don't override image that might have come from stream API
            if (!imageSrc || imageSrc === DEFAULT_IMAGE) {
              setImageSrc(DEFAULT_IMAGE);
            }
          }

          // Update title if not already set from stream API
          if (data.show?.name && !showTitle) {
            setShowTitle(data.show.name);
          }
        } else {
          console.warn('No show data in response');
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch show details:', errorText);
        // Don't treat this as a critical error, since we can still play the track
      }
    } catch (error) {
      console.error('Error fetching show details:', error);
      // Don't treat this as a critical error, since we can still play the track
    }
  }, [currentShowUrl, trackId, imageSrc, showTitle]);

  // Effect to fetch audio URL for Soundcloud
  useEffect(() => {
    console.log('useEffect triggered with:', { activePlayer, trackId });

    setAudioUrl('');
    setWidgetUrl('');
    setStreamFormat('');
    setError(null);
    setRetryCount(0);
    setUseWidget(false);
    setAvailableFormats([]);

    if (activePlayer === ActivePlayer.SOUNDCLOUD && trackId) {
      console.log('Fetching Soundcloud data...');
      fetchSoundcloudAudio();
      fetchShowDetails();
    }
  }, [activePlayer, trackId, fetchSoundcloudAudio, fetchShowDetails]);

  // Handle play/pause for Soundcloud
  const handlePlayPause = () => {
    console.log('Play/Pause clicked, current state:', { isPlaying });

    // Only handle play/pause for Soundcloud and when not using widget
    if (activePlayer === ActivePlayer.SOUNDCLOUD && !useWidget) {
      if (audioRef.current) {
        if (isPlaying) {
          console.log('Pausing audio');
          audioRef.current.pause();
        } else {
          console.log('Playing audio');
          audioRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle audio error and switch to widget if needed
  const handleAudioError = (
    event: React.SyntheticEvent<HTMLAudioElement, Event>,
    errorMessage: string
  ) => {
    console.error('Audio player error:', errorMessage);
    console.log('Available formats were:', availableFormats);

    // Always switch to widget if available when there's an audio error
    if (widgetUrl) {
      console.log('Switching to Soundcloud widget after audio error');
      setError(`Error playing audio: ${errorMessage}`);
      setUseWidget(true);
      return;
    }

    // If no widget URL available, just show the error
    setError(`Error playing audio: ${errorMessage}`);

    // Try fetching the audio again only once
    if (retryCount === 0) {
      setRetryCount((prev) => prev + 1);
      console.log('Retrying audio fetch...');
      fetchSoundcloudAudio();
    }
  };

  // If no active player, don't render
  if (activePlayer === undefined) {
    console.log('No active player, not rendering');
    return null;
  }

  // For Mixcloud, we use the dedicated MixcloudWidget component
  if (activePlayer === ActivePlayer.MIXCLOUD) {
    console.log('Using MixcloudWidget');
    return <MixcloudWidget />;
  }

  console.log('Rendering Soundcloud player with:', {
    audioUrl,
    widgetUrl,
    streamFormat,
    showTitle,
    isLoading,
    error,
    retryCount,
    useWidget,
    availableFormats,
  });

  // Get show name safely
  const showName =
    showTitle || (currentShow ? getShowName(currentShow) : 'Audio player');

  // Determine the platform display text
  const getPlatformText = () => {
    if (!currentShow) return '';
    return currentShow.platform === 'mixcloud' ? 'Mixcloud' : 'Soundcloud';
  };

  // Render Soundcloud player
  return (
    <div className='fixed bottom-0 left-0 w-full lg:w-2/3 bg-white border-t border-thf-blue-500 p-2 flex items-center z-50'>
      {/* Show artwork and info */}
      <div className='flex items-center mr-2 md:mr-4'>
        <div className='relative w-10 h-10 md:w-12 md:h-12 mr-2 md:mr-3 flex-shrink-0'>
          <Image
            src={imageSrc || DEFAULT_IMAGE}
            alt={showName || 'THF Radio Show'}
            width={48}
            height={48}
            className='object-cover rounded-sm'
          />
          {isLoading && (
            <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-sm'>
              <BarsSpinner color='#ffffff' />
            </div>
          )}
        </div>
        <div className='mr-2 md:mr-4 hidden sm:block'>
          <p className='text-xs md:text-sm font-bold truncate max-w-[120px] md:max-w-[200px]'>
            {showName}
          </p>
          {currentShow && (
            <p className='text-xs text-gray-600 truncate max-w-[120px] md:max-w-[200px]'>
              {getPlatformText()}
              {streamFormat && !useWidget && ` (${streamFormat})`}
              {useWidget && ' (widget)'}
            </p>
          )}
          {error && !useWidget && (
            <p className='text-xs text-red-600 truncate max-w-[120px] md:max-w-[200px]'>
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Play/Pause button - only show when not using widget */}
      {!useWidget && (
        <button
          onClick={handlePlayPause}
          className='mr-2 md:mr-4 flex-shrink-0 hover:scale-110 transition-transform duration-200'
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className='w-5 h-5 md:w-6 md:h-6' fill='#1200ff' />
          ) : (
            <Play className='w-5 h-5 md:w-6 md:h-6' fill='#1200ff' />
          )}
        </button>
      )}

      {/* Audio player for Soundcloud - direct streaming */}
      {audioUrl && !useWidget && (
        <div className='flex-grow'>
          <AudioPlayer
            ref={audioRef}
            src={audioUrl}
            autoPlay={true}
            className='thf-audio-player'
            volume={0.8}
            onPlay={() => {
              console.log('Audio playing');
              setIsPlaying(true);
            }}
            onPause={() => {
              console.log('Audio paused');
              setIsPlaying(false);
            }}
            onEnd={() => {
              console.log('Audio ended');
              setIsPlaying(false);
            }}
            onError={handleAudioError}
          />
        </div>
      )}

      {/* Fallback to Soundcloud widget if direct streaming fails */}
      {useWidget && widgetUrl && (
        <div className='flex-grow h-[60px]'>
          <iframe
            width='100%'
            height='60'
            frameBorder='no'
            allow='autoplay'
            src={widgetUrl}
            className='w-full'
          ></iframe>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className='ml-2 md:ml-4 flex-shrink-0 hover:scale-110 transition-transform duration-300 text-gray-500 hover:text-orange-500 hover:cursor-pointer'
        aria-label='Close player'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <line x1='18' y1='6' x2='6' y2='18'></line>
          <line x1='6' y1='6' x2='18' y2='18'></line>
        </svg>
      </button>
    </div>
  );
}
