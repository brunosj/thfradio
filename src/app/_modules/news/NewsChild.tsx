import React from 'react';
import type { NewsType } from '@/types/ResponsesInterface';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { CMS_URL } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';

interface NewsProps {
  item: NewsType;
}

const NewsChild: React.FC<NewsProps> = ({ item }) => {
  const formattedDate = formatDate(item.attributes.date);

  return (
    <div className=' text-white rounded-xl' id={item.attributes.slug}>
      <div className='relative w-full h-48 lg:h-72 aspect-video'>
        <Image
          quality={50}
          src={`${CMS_URL}${item.attributes.picture.data.attributes.url}`}
          fill
          sizes=''
          className='object-contain object-center rounded-t-xl aspect-video p-4'
          alt={item.attributes.picture.data.attributes.name}
        />
      </div>
      <div className='relative pt-6 bg-thf-blue-500'>
        <div className='absolute top-0 left-0 h-8 w-1/3 lg:w-1/4 bg-orange-500 text-white text-sm flex justify-center rounded-br-xl items-center'>
          <p>{formattedDate}</p>
        </div>
        <div className='space-y-6 p-6'>
          <h2>{item.attributes.title}</h2>
          <div className='markdown'>
            <ReactMarkdown>{item.attributes.text}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsChild;
