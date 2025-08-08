import { ChevronLeft, Send } from "lucide-react";
import { ChatMessageList } from "./components/ui/chat/chat-message-list";
import {
  ChatBubble,
  ChatBubbleMessage,
} from "./components/ui/chat/chat-bubble";
import { ChatInput } from "./components/ui/chat/chat-input";
import { useEffect, useState, useRef } from "react";
import { useWidget } from "./context/WidgetContext";
import ReactMarkdown from "react-markdown";
import PropTypes from "prop-types";

const Message = ({ onBack }) => {
  const {
    messages,
    sendMessage,
    initializeChat,
    cleanupChat,
    isLoading,
    agentId,
    widgetId,
    widgetConfig,
    isChatEnded,
  } = useWidget();
  const [message, setMessage] = useState("");
  const sessionStartTime = useRef(Date.now().toString()).current;

  // State for paragraph delays
  const [visibleParagraphs, setVisibleParagraphs] = useState({});
  const paragraphTimeoutRefs = useRef({});

  const getAvatarUrl = () => {
    const seed = `${widgetId || "default"}-${sessionStartTime}`;
    const bgColor = (widgetConfig?.themeColor || "#6b7280").replace("#", "");
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(
      seed
    )}&backgroundColor=${bgColor}&radius=50`;
  };

  useEffect(() => {
    let isMounted = false;

    if (!isMounted) {
      console.log("setting up websocket01");
      initializeChat(agentId);
      isMounted = true;
    }

    return () => {
      console.log("setting up websocket02");
      isMounted = false;
      cleanupChat();
    };
  }, [agentId]);

  // Function to split text into sentences
  const splitIntoSentences = (text) => {
    // Split by sentence endings, but keep the punctuation
    return text.match(/[^.!?]*[.!?]+/g) || [text];
  };

  // Function to split message into paragraphs if it has more than 2 sentences
  const splitIntoParagraphs = (text) => {
    const sentences = splitIntoSentences(text);

    if (sentences.length <= 2) {
      return [text]; // Return as single paragraph
    }

    // Split into two paragraphs
    const midPoint = Math.ceil(sentences.length / 2);
    const firstParagraph = sentences.slice(0, midPoint).join(" ").trim();
    const secondParagraph = sentences.slice(midPoint).join(" ").trim();

    return [firstParagraph, secondParagraph];
  };

  // Effect to handle paragraph delays for agent messages
  useEffect(() => {
    messages.forEach((msg, messageIndex) => {
      if (msg.source === "assistant") {
        const paragraphs = splitIntoParagraphs(msg.text);

        if (paragraphs.length > 1) {
          const messageKey = `${messageIndex}`;

          // Show first paragraph immediately
          if (!visibleParagraphs[`${messageKey}-0`]) {
            setVisibleParagraphs((prev) => ({
              ...prev,
              [`${messageKey}-0`]: true,
            }));
          }

          // Show second paragraph with delay
          if (!visibleParagraphs[`${messageKey}-1`]) {
            // Clear any existing timeout for this message
            if (paragraphTimeoutRefs.current[messageKey]) {
              clearTimeout(paragraphTimeoutRefs.current[messageKey]);
            }

            paragraphTimeoutRefs.current[messageKey] = setTimeout(() => {
              setVisibleParagraphs((prev) => ({
                ...prev,
                [`${messageKey}-1`]: true,
              }));
            }, 2000); // 2 second delay for second paragraph
          }
        }
      }
    });

    // Cleanup function
    return () => {
      Object.values(paragraphTimeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [messages, visibleParagraphs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await sendMessage(message);
    if (success) {
      setMessage("");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="bg-black px-4 py-[22px] h-full max-h-[92px] rounded-t-[18px] flex flex-col">
        <div className="flex justify-evenly gap-2 items-center mr-auto">
          <ChevronLeft
            onClick={onBack}
            className="text-white hover:cursor-pointer"
          />
          <img src={getAvatarUrl()} alt="avatar" width={40} height={40} />
          <div className="flex flex-col text-white text-base leading-6">
            <p className="font-medium text-zinc-100">
              {widgetConfig?.agentName || "AI Agent"}
            </p>
            <p className="text-zinc-200/[.5] text-sm">
              {widgetConfig?.agentType || "Support Agent"}
            </p>
          </div>
        </div>
      </div>
      <div className="w-full mx-auto max-h-[471px] h-full bg-white">
        <ChatMessageList className="overflow-y-scroll">
          {messages.map((message, index) => {
            const isAssistant = message.source === "assistant";
            const paragraphs = isAssistant
              ? splitIntoParagraphs(message.text)
              : [message.text];

            return paragraphs.map((paragraph, pIndex) => {
              const messageKey = `${index}`;
              const isVisible =
                !isAssistant ||
                paragraphs.length === 1 ||
                visibleParagraphs[`${messageKey}-${pIndex}`];

              if (!isVisible) return null;

              return (
                <ChatBubble
                  key={`message-${index}-${pIndex}`}
                  variant={isAssistant ? "received" : "sent"}
                  className={!isAssistant ? "max-w-[85%]" : "max-w-[85%]"}
                >
                  {isAssistant && (
                    <img
                      src={getAvatarUrl()}
                      alt="ai image"
                      className="rounded-full"
                      width="24"
                      height="24"
                    />
                  )}

                  <ChatBubbleMessage
                    as="div"
                    className={`text-sm font-geist leading-5 ${
                      isAssistant ? "bg-gray-100" : "bg-gray-800"
                    }`}
                  >
                    <ReactMarkdown>{paragraph}</ReactMarkdown>
                  </ChatBubbleMessage>
                </ChatBubble>
              );
            });
          })}
        </ChatMessageList>
        {!isChatEnded && (
          <div className="px-4 bottom-0 bg-secondary rounded-b-lg h-[80px] flex items-center">
            <form
              className="flex items-center justify-center gap-2 w-full"
              onSubmit={handleSubmit}
            >
              <ChatInput
                placeholder="Type your message here..."
                className="min-h-12 resize-none bg-gray-100 text-slate-950 rounded-full p-3 shadow-none focus:ring-0 focus-visible:ring-0 focus:border-0 focus-visible:border-0 border-0 ring-0 flex items-center placeholder:text-[var(--slate-400,#94A3B8)]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button type="submit" className="ml-auto bg-transparent">
                <Send className="text-slate-400 h-6 w-6" />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};

Message.propTypes = {
  onBack: PropTypes.func.isRequired,
  agentId: PropTypes.string,
};

export default Message;
