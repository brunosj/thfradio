export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  pseudo: string;
  timestamp: number;
}

export interface ServerMessage {
  type: 'message' | 'history' | 'pong';
  message?: ChatMessage;
  messages?: ChatMessage[];
}

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};