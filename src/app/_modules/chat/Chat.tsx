'use client';

import { format } from 'date-fns';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useChatState } from '../../_context/ChatContext';
import { MessageContent } from './MessageContent';
import { getUserColor } from './Chat.utils';
import { XMarkIcon } from '../../_common/assets/XMarkIcon';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  text: string;
  userId: string | null; // null for anonymous users
  pseudo: string;
  timestamp: number;
}

interface ServerMessage {
  type: 'message' | 'history' | 'pong' | 'announcement';
  message?: ChatMessage;
  messages?: ChatMessage[];
}

export type ChatVariant = 'overlay' | 'inline' | 'studio';

export interface ChatProps {
  /** `overlay`: FAB popup. `inline`: `/chat` in layout. `studio`: full-viewport kiosk, no nav. */
  variant?: ChatVariant;
}

export const Chat = ({ variant = 'overlay' }: ChatProps) => {
  const { isChatOpen: isOpen, setIsChatOpen: setIsOpen } = useChatState();
  const isEmbedded = variant === 'inline' || variant === 'studio';
  const shouldConnect = isEmbedded || isOpen;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatUserId');
      if (saved) return saved;
      const newId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chatUserId', newId);
      return newId;
    }
    return Math.random().toString(36).substr(2, 9);
  });

  const [lastSentTime, setLastSentTime] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const savedPseudo = localStorage.getItem('chatPseudo') || '';
    setPseudo(savedPseudo);
  }, []);

  useEffect(() => {
    if (pseudo) {
      localStorage.setItem('chatPseudo', pseudo);
    }
  }, [pseudo]);

  useEffect(() => {
    let isActive = true;

    if (!shouldConnect) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const connectSocket = () => {
      if (socketRef.current?.connected) return;

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
        if (!backendUrl) return;

        const socketUrl = `${backendUrl}/chat`;

        socketRef.current = io(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
          upgrade: true,
          forceNew: false,
          secure: backendUrl.startsWith('https'),
        });

        socketRef.current.on('connect', () => {
          if (!isActive) return;
          setIsConnected(true);
          setError(null);
        });

        socketRef.current.on('message', (data: ServerMessage) => {
          if (!isActive) return;
          try {
            if (data.type === 'history' && data.messages) {
              setMessages(data.messages);
            } else if (
              (data.type === 'message' || data.type === 'announcement') &&
              data.message
            ) {
              setMessages((prev) => [...prev, data.message as ChatMessage]);
            }
            scrollToBottom();
          } catch (error) {
            console.error('Error processing message:', error);
          }
        });

        socketRef.current.on('disconnect', (reason: string) => {
          if (!isActive) return;
          setIsConnected(false);
        });

        socketRef.current.on('error', (error: any) => {
          if (!isActive) return;
          console.error('WebSocket error:', error);
          setError(t('chat.connectionError'));
        });

        socketRef.current.on('connect_error', (error: any) => {
          if (!isActive) return;
          console.error('Connection error:', error);
          setError(t('chat.connectionError'));
        });
      } catch (error) {
        console.error('Failed to create connection:', error);
        setError(t('chat.connectionError'));
      }
    };

    connectSocket();

    return () => {
      isActive = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [shouldConnect, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if ((isEmbedded || isOpen) && e.code === 'Space' && !isInputField) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEmbedded]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    const now = Date.now();
    if (!newMessage.trim() || !pseudo) {
      return;
    }

    // Rate limiting: 1 second between messages
    if (now - lastSentTime < 1000) {
      return;
    }

    try {
      const sanitizedMessage = newMessage.trim();
      const sanitizedPseudo = pseudo.trim();

      if (sanitizedMessage.length > 500 || sanitizedPseudo.length > 20) {
        setError(t('chat.errorTooLong'));
        return;
      }

      const message: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        text: sanitizedMessage,
        userId: null, // Anonymous users send null, not generated IDs
        pseudo: sanitizedPseudo,
        timestamp: now,
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit('message', message);
      } else {
        setError(t('chat.lostConnection'));
      }

      setNewMessage('');
      setLastSentTime(now);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      setError(t('chat.errors.sendFailed'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const rootClassName = isEmbedded
    ? 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white'
    : `fixed transition-shadow transition-all duration-300 z-[999] flex flex-col bg-white overflow-hidden
        ${
          isOpen
            ? 'inset-0 opacity-100 visible'
            : 'inset-x-0 bottom-0 h-0 opacity-0 invisible'
        }
        md:inset-auto md:bottom-2 md:right-2 md:w-120 md:border md:border-gray-300 md:rounded-lg
        ${isOpen ? 'md:h-150 md:opacity-100 md:visible shadow-xl' : 'md:h-0 md:opacity-0 md:invisible'}`;

  return (
    <div className={rootClassName}>
      {/* Header */}
      <div className='flex justify-between items-center bg-orange-500 text-white p-4 h-16 shrink-0'>
        <div className='flex items-center gap-2'>
          <span className='font-mono font-semibold text-sm'>
            THF Radio Chat
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-300' : 'bg-red-300'
            }`}
          />
        </div>
        {variant === 'inline' ? (
          <Link
            href='/'
            className='text-sm font-mono font-semibold underline-offset-2 hover:underline shrink-0'
          >
            {t('chat.backHome')}
          </Link>
        ) : variant === 'studio' ? (
          <span className='w-8 shrink-0' aria-hidden />
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className='cursor-pointer hover:opacity-80 transition-opacity'
            aria-label={t('chat.fermer')}
            title={t('chat.fermer')}
          >
            <XMarkIcon />
          </button>
        )}
      </div>

      {/* Pseudo Input */}
      <div className='flex justify-between items-center px-4 py-3 border-b border-gray-300 shrink-0'>
        <input
          type='text'
          value={pseudo}
          onChange={(e: { target: { value: SetStateAction<string> } }) =>
            setPseudo(e.target.value)
          }
          placeholder={t('chat.pseudo')}
          maxLength={20}
          autoFocus
          className='grow px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500'
        />
      </div>

      {/* Messages Area */}
      <div className='min-h-0 flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50'>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[80%] px-3 py-2 rounded text-sm text-white ${
              message.pseudo === pseudo ? 'bg-orange-500 ml-auto' : ''
            }`}
            style={{
              backgroundColor:
                message.pseudo === pseudo
                  ? '#ff6314'
                  : getUserColor(message.pseudo),
            }}
          >
            <div className='flex justify-between items-baseline gap-4 mb-0.5'>
              <strong className='text-[10px] uppercase font-bold tracking-wider'>
                {message.pseudo === pseudo ? t('chat.moi') : message.pseudo}
              </strong>
              <span className='text-[9px] opacity-80 font-mono'>
                {format(new Date(message.timestamp), 'HH:mm')}
              </span>
            </div>
            <MessageContent text={message.text} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className='flex gap-2 p-4 bg-gray-100 border-t border-gray-300 shrink-0'>
        <input
          type='text'
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={pseudo ? t('chat.ecrivez') : t('chat.chatPseudo')}
          disabled={!pseudo || !isConnected}
          className='grow px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-200 disabled:cursor-not-allowed h-8'
        />
        <button
          onClick={sendMessage}
          disabled={!pseudo || !isConnected}
          aria-label={t('chat.envoyer')}
          title={t('chat.envoyer')}
          className='px-3 py-2 bg-orange-500 text-white rounded text-sm font-semibold hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors h-8 flex items-center justify-center'
        >
          {isConnected ? '→' : '...'}
        </button>
      </div>

      {error && (
        <div className='p-2 bg-red-100 text-red-800 text-xs border-t border-red-300 flex justify-between items-center shrink-0'>
          <span>{error}</span>
          <button onClick={() => setError(null)} className='underline ml-2'>
            Close
          </button>
        </div>
      )}
    </div>
  );
};
