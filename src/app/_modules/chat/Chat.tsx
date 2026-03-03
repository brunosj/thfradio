import { SetStateAction, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useChatState } from "../../_context/ChatContext";
import { MessageContent } from "./MessageContent";
import { getUserColor } from "./Chat.utils";
import { XMarkIcon } from "../../_common/assets/XMarkIcon";
import { CMS_URL } from "@/app/_utils/constants";

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  pseudo: string;
  timestamp: number;
}

interface ServerMessage {
  type: "message" | "history";
  message?: ChatMessage;
  messages?: ChatMessage[];
}
// const sanitizeInput = (input: string): string => {
//   return input
//     .replace(/[&<>"'\/]/g, (char) => {
//       const entities: { [key: string]: string } = {
//         '&': '&amp;',
//         '<': '&lt;',
//         '>': '&gt;',
//         '"': '&quot;',
//         "'": '&#x27;',
//         '/': '&#x2F;'
//       };
//       // Show the actual character in display, but encode it for safety
//       return `${char}${entities[char]}`;
//     })
//     .trim();
// };
export const Chat = () => {
  const { isChatOpen: isOpen, setIsChatOpen: setIsOpen } = useChatState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [pseudo, setPseudo] = useState("");

  useEffect(() => {
    const savedPseudo = localStorage.getItem("chatPseudo") || "";
    setPseudo(savedPseudo);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (pseudo) {
      localStorage.setItem("chatPseudo", pseudo);
    }
  }, [pseudo]);

  useEffect(() => {
    let isActive = true;

    const connectWebSocket = () => {
      if (!isOpen || ws.current?.readyState === WebSocket.OPEN) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = CMS_URL.replace(/^https?:\/\//, "");
      const wsUrl = `${protocol}//${host}/chat`;

      console.log("Attempting WebSocket connection to:", wsUrl);

      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          if (!isActive) return;
          console.log("WebSocket connection established");
          setError(null);
        };

        ws.current.onmessage = (event) => {
          if (!isActive) return;
          try {
            const data = JSON.parse(event.data) as ServerMessage;
            console.log("Received from server:", data);

            if (data.type === "history" && data.messages) {
              setMessages(data.messages);
            } else if (data.type === "message" && data.message) {
              setMessages((prev) => [...prev, data.message as ChatMessage]);
            }
            scrollToBottom();
          } catch (error) {
            console.error("Error parsing received message:", error);
          }
        };

        ws.current.onclose = (event) => {
          if (!isActive) return;
          console.info("WebSocket connection closed:", event.code, event.reason);
          ws.current = null;

          // Attempt to reconnect on abnormal closure
          if (event.code !== 1000 && isOpen) {
            console.log("Attempting reconnection in 3s...");
            setTimeout(connectWebSocket, 3000);
          }
        };

        ws.current.onerror = (error) => {
          if (!isActive) return;
          console.error("WebSocket error:", error);
          setError(t("chat.connectionError"));
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
        setError(t("chat.connectionError"));
      }
    };

    connectWebSocket();

    return () => {
      isActive = false;
      if (ws.current && isOpen === false) {
        console.log("Cleaning up WebSocket connection");
        ws.current.close(1000); // Normal closure
        ws.current = null;
      }
    };
  }, [isOpen, t]);

  useEffect(() => {
    // Prevent space bar from triggering player only when not in input fields
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if (isOpen && e.code === "Space" && !isInputField) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const sendMessage = () => {
    if (!newMessage.trim() || !pseudo) return;

    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError(t("chat.wait"));
      return;
    }

    try {
      // Basic sanitization - remove HTML tags and dangerous characters
      const sanitizedMessage = newMessage
        .replace(
          /[&<>"']/g,
          (char) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#x27;",
            })[char] || char,
        )
        .trim();

      const sanitizedPseudo = pseudo
        .replace(
          /[&<>"']/g,
          (char) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#x27;",
            })[char] || char,
        )
        .trim();

      if (sanitizedMessage.length > 500 || sanitizedPseudo.length > 20) {
        setError(t("chat.errorTooLong"));
        return;
      }

      const message = {
        id: Math.random().toString(36).substr(2, 9),
        text: sanitizedMessage,
        userId,
        pseudo: sanitizedPseudo,
        timestamp: Date.now(),
      };

      ws.current.send(JSON.stringify(message));
      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      setError(t("chat.errors.sendFailed"));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div
      className={`fixed bottom-16 right-5 w-80 bg-white border border-gray-300 rounded-lg overflow-hidden transition-all duration-300 z-50 flex flex-col ${isOpen ? "h-96 opacity-100 visible" : "h-0 opacity-0 invisible"
        } md:bottom-2 md:right-2`}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-orange-500 text-white p-4 h-16">
        <span className="font-mono font-semibold text-sm">THF Radio Chat</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          aria-label={t("chat.fermer")}
          title={t("chat.fermer")}
        >
          <XMarkIcon />
        </button>
      </div>

      {/* Pseudo Input */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-300">
        <input
          type="text"
          value={pseudo}
          onChange={(e: { target: { value: SetStateAction<string> } }) =>
            setPseudo(e.target.value)
          }
          placeholder={t("chat.pseudo")}
          maxLength={20}
          autoFocus
          className="flex-grow px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-xs px-3 py-2 rounded text-sm text-white ${message.pseudo === pseudo ? "bg-orange-500 ml-auto" : ""
              }`}
            style={{
              backgroundColor:
                message.pseudo === pseudo
                  ? "#ff6314"
                  : getUserColor(message.pseudo),
            }}
          >
            <strong className="text-xs block mb-1">
              {message.pseudo === pseudo ? t("chat.moi") : message.pseudo}
            </strong>
            <MessageContent text={message.text} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 p-4 bg-gray-100 border-t border-gray-300">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={pseudo ? t("chat.ecrivez") : t("chat.chatPseudo")}
          disabled={!pseudo}
          className="flex-grow px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-200 disabled:cursor-not-allowed h-8"
        />
        <button
          onClick={sendMessage}
          disabled={!pseudo}
          aria-label={t("chat.envoyer")}
          title={t("chat.envoyer")}
          className="px-3 py-2 bg-orange-500 text-white rounded text-sm font-semibold hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors h-8 flex items-center justify-center"
        >
          {ws.current?.readyState === WebSocket.OPEN ? "→" : "..."}
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-100 text-red-800 text-xs border-t border-red-300 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline ml-2">
            Close
          </button>
        </div>
      )}
    </div>
  );
};
