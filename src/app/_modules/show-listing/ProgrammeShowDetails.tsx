import React from 'react';
import { AiOutlineInstagram } from 'react-icons/ai';
import { CiMail } from 'react-icons/ci';
import Image from 'next/image';
import {
  SlSocialSoundcloud,
  SlSocialSpotify,
  SlGlobe,
  SlSocialTwitter,
} from 'react-icons/sl';
import { Link } from '@/i18n/routing';
import ReactMarkdown from 'react-markdown';
import { Wave } from '@/common/assets/WaveSVG';
import { CMS_URL } from '@/utils/constants';
import { useLocale } from 'next-intl';

interface ShowDetailsProps {
  currentContent: {
    attributes: {
      title: string;
      description: string;
      frequency?: string;
      day?: string;
      startTime?: string;
      endTime?: string;
      instagram?: string;
      mail?: string;
      soundcloud?: string;
      spotify?: string;
      website?: string;
      twitterx?: string;
      picture?: {
        data: {
          id: number;
          attributes: {
            name: string;
            url: string;
          };
        };
      };
    };
  };
}

const ShowDetails: React.FC<ShowDetailsProps> = ({ currentContent }) => {
  const locale = useLocale();

  const getGermanDay = (day: string): string => {
    if (locale === 'en') {
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
    switch (day) {
      case 'monday':
        return 'Montag';
      case 'tuesday':
        return 'Dienstag';
      case 'wednesday':
        return 'Mittwoch';
      case 'thursday':
        return 'Donnerstag';
      case 'friday':
        return 'Freitag';
      case 'saturday':
        return 'Samstag';
      case 'sunday':
        return 'Sonntag';
      default:
        return day;
    }
  };

  const getGermanFrequency = (frequency: string): string => {
    if (locale === 'en') {
      return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    }
    switch (frequency) {
      case 'bi-weekly':
        return 'Zweiwöchentlich';
      case 'weekly':
        return 'Wöchentlich';
      case 'monthly':
        return 'Monatlich';
      case 'bi-monthly':
        return 'Zweimonatlich';
      case 'occasionally':
        return 'Gelegentlich';
      default:
        return frequency;
    }
  };

  const formatTime = (time: string): string => {
    return time ? time.slice(0, 5) : '';
  };

  return (
    <div className='bg-thf-blue-500 rounded-xl text-white lg:w-[85%] xl:w-3/4  max-h-fit relative lg:absolute lg:-bottom-40'>
      <div className='layout py-6 lg:py-12 space-y-6'>
        <div className='flex items-center gap-6'>
          {currentContent.attributes.picture?.data && (
            <div className='relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0'>
              <Image
                quality={50}
                src={`${CMS_URL}${currentContent.attributes.picture?.data.attributes.url}`}
                fill
                sizes=''
                className='object-cover rounded-xl aspect-square '
                alt={currentContent.attributes.picture?.data.attributes.name}
              />
            </div>
          )}
          <h1 className='font-bold'>{currentContent.attributes.title}</h1>
        </div>
        <div className=' text-white z-0 text-sm lg:text-base' id='showDetails'>
          {currentContent.attributes.frequency &&
            currentContent.attributes.day &&
            currentContent.attributes.startTime &&
            currentContent.attributes.endTime && (
              <div className='mt-6'>
                <p>
                  {getGermanDay(currentContent.attributes.day)}{' '}
                  {formatTime(currentContent.attributes.startTime)} <Wave />{' '}
                  {formatTime(currentContent.attributes.endTime)} (
                  {getGermanFrequency(currentContent.attributes.frequency)})
                </p>
                <div className='flex space-x-3 mt-1'>
                  {currentContent.attributes.instagram && (
                    <Link
                      href={currentContent.attributes.instagram}
                      target='_blank'
                    >
                      <AiOutlineInstagram className='w-6 h-6 textHover' />
                    </Link>
                  )}
                  {currentContent.attributes.soundcloud && (
                    <Link
                      href={currentContent.attributes.soundcloud}
                      target='_blank'
                    >
                      <SlSocialSoundcloud className='w-6 h-6 textHover' />
                    </Link>
                  )}
                  {currentContent.attributes.spotify && (
                    <Link
                      href={currentContent.attributes.spotify}
                      target='_blank'
                    >
                      <SlSocialSpotify className='w-6 h-6 textHover' />
                    </Link>
                  )}
                  {currentContent.attributes.twitterx && (
                    <Link
                      href={currentContent.attributes.twitterx}
                      target='_blank'
                    >
                      <SlSocialTwitter className='w-6 h-6 textHover' />
                    </Link>
                  )}
                  {currentContent.attributes.website && (
                    <Link
                      href={currentContent.attributes.website}
                      target='_blank'
                    >
                      <SlGlobe className='w-6 h-6 textHover' />
                    </Link>
                  )}
                  {currentContent.attributes.mail && (
                    <Link
                      href={`mailto:${currentContent.attributes.mail}`}
                      target='_blank'
                    >
                      <CiMail className='w-6 h-6 textHover' />
                    </Link>
                  )}
                </div>
              </div>
            )}
        </div>
        <div className='text-xs md:text-sm lg:text-base markdown'>
          <ReactMarkdown>{currentContent.attributes.description}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ShowDetails;
