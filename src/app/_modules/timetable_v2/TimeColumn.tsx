import React from 'react';

export default function TimeColumn() {
  // Create an array of hours from 10am to midnight
  const hours = Array.from({ length: 15 }, (_, i) => (i + 10) % 24);

  return (
    <div className='relative w-16'>
      {hours.map((hour, index) => (
        <div
          key={index}
          className='flex items-start justify-end pr-2 border-b border-gray-200'
          style={{ height: '60px' }}
        >
          <span className='text-xs font-medium text-gray-500'>
            {hour === 0 ? '00:00' : `${hour}:00`}
          </span>
        </div>
      ))}
    </div>
  );
}
