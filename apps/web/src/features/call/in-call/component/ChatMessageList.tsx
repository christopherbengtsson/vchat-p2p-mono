import { observer } from 'mobx-react';
import { ChatData } from '@mono/common-dto';
import { cn } from '@/common/lib/utils';
import { ChatBubble } from './ChatBubble';

interface Props {
  isOpen: boolean;
  chatMessages: ChatData[];
  notificationMessages: ChatData[];
  socketId: string;
  handleMessagesListClick: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList = observer(function ChatMessageList({
  chatMessages,
  handleMessagesListClick,
  isOpen,
  messagesEndRef,
  notificationMessages,
  socketId,
}: Props) {
  return (
    <div
      onClick={handleMessagesListClick}
      className={cn(
        'flex-1 overflow-y-auto p-4 flex flex-col',
        'w-full',
        'md:w-3/5',
        'lg:w-2/5',
        'xl:w-1/3',
        'mr-auto',
      )}
    >
      <div className="flex-1" />
      <div className="space-y-2">
        {(isOpen ? chatMessages : notificationMessages).map((message) => (
          <ChatBubble
            key={`${message.timestamp}-${message.senderSocketId}`}
            message={message.message}
            isOwnMessage={message.senderSocketId === socketId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});
