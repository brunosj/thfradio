"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface ChatContextType {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("chat_open");
    if (savedState !== null) {
      setIsChatOpen(savedState === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_open", isChatOpen.toString());
  }, [isChatOpen]);

  return (
    <ChatContext.Provider value={{ isChatOpen, setIsChatOpen }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatState = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatState must be used within a ChatProvider");
  }
  return context;
};
