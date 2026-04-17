import { memo } from 'react';

interface MessageContentProps {
  text: string;
}

export const MessageContent = memo(({ text }: MessageContentProps) => {
  return (
    <div className='whitespace-pre-wrap wrap-break-words text-sm'>{text}</div>
  );
});

MessageContent.displayName = 'MessageContent';
