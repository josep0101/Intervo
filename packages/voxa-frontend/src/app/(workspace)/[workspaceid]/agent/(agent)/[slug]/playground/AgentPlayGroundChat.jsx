import React, { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePlayground } from "@/context/AgentContext";
import usePrevious from "@/hooks/usePrevious";
import {
  ChatBubble,
  ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { Button } from "@/components/ui/button";
import AiIcon from "@/assets/aichat.svg";
import Image from "next/image";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import returnAPIUrl from "@/config/config";

const AgentPlayGroundChat = () => {
  const { messages, addMessage, isConnected, sendWebSocketMessage } =
    usePlayground();
  const prevIsConnected = usePrevious(isConnected);

  useEffect(() => {
    if (isConnected && !prevIsConnected) {
      // Clear messages when connection starts
      setMessages([]);
    }
  }, [isConnected, prevIsConnected]);

  const sendMessage = (text) => {
    try {
      if (text.trim() !== "") {
        addMessage({ text, source: "You" });
        // Wrap in a try-catch to safely handle WebSocket errors
        try {
          sendWebSocketMessage(text);
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
          // Fail gracefully - don't rethrow
        }
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
    }
  };

  console.log(messages, "messages");
  return (
    <div className="w-full mx-auto h-[calc(100vh-15.45rem)] bg-secondary">
      <ChatMessageList className="overflow-y-scroll">
        {messages.map((message, index) => (
          <ChatBubble
            key={index}
            variant={message.source === "assistant" ? "received" : "sent"}
          >
            {message.source === "assistant" ? (
              <Image src={AiIcon} alt="ai image" className="rounded-full" />
            ) : (
              <Avatar>
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="@shadcn"
                />
              </Avatar>
            )}
            <ChatBubbleMessage className="text-sm font-geist leading-5">
              {message.text}
            </ChatBubbleMessage>
          </ChatBubble>
        ))}
      </ChatMessageList>
      <div className="px-4 pb-4 bottom-0 bg-secondary rounded-b-lg">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.target.elements[0];
            sendMessage(input.value);
            input.value = "";
          }}
        >
          <ChatInput
            placeholder="Type your message here..."
            className="min-h-12 resize-none bg-white rounded-full border-0 p-3 shadow-none ring-1"
          />
          <Button type="submit" className="ml-auto gap-1.5">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AgentPlayGroundChat;
