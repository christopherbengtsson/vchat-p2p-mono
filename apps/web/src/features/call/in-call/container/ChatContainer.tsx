import { useState, useRef, useCallback } from 'react';
import { observer } from 'mobx-react';
import { toast } from 'sonner';
import { WebRTCService } from '@mono/fe-webrtc';
import { ChatData } from '@mono/common-dto';
import { cn } from '@/common/lib/utils';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useCallStore } from '../../context/useCallStore';
import { useChatEffects } from '../hooks/useChatEffects';
import { ChatMessageList } from '../component/ChatMessageList';
import { ChatMessageInput } from '../component/ChatMessageInput';

const MAX_MESSAGE_LENGTH = 1000;

interface Props {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatContainer = observer(function ChatContainer({
  isOpen,
  onToggle,
}: Props) {
  const { authStore, socketStore } = useRootStore();
  const {
    chatMessages,
    showMessageNotification,
    hideMessageNotification,
    notificationMessages,
    addChatMessage,
    clearNotificationMessages,
  } = useCallStore();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useChatEffects({
    isOpen,
    notificationMessages,
    chatMessages,
    showMessageNotification,
    hideMessageNotification,
    clearNotificationMessages,
    messagesEndRef,
    inputRef,
  });

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim()) {
      const data: ChatData = {
        message: newMessage.trim(),
        senderSocketId: socketStore.id,
        senderUserId: authStore.userId,
        timestamp: Date.now(),
      };

      const onError = () => toast.error('Failed to send message');

      const success = WebRTCService.get()?.sendMessage(
        { type: 'CHAT', data },
        onError,
      );

      if (success) {
        addChatMessage(data);
        setNewMessage('');
      }
    }
  }, [addChatMessage, authStore.userId, newMessage, socketStore.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const handleChatOverlayClick = useCallback(
    (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (ev.target !== ev.currentTarget) return;

      if (isOpen) {
        onToggle();
      }
    },
    [isOpen, onToggle],
  );

  const handleMessagesListClick = useCallback(() => {
    if (isOpen) {
      // If chat is already open, clicking messages area closes it
      onToggle();
    } else if (showMessageNotification) {
      // If notification is showing, clicking opens chat and hides notification
      hideMessageNotification();
      onToggle();
    }
  }, [hideMessageNotification, isOpen, onToggle, showMessageNotification]);

  return (
    <>
      {/* Chat Panel */}
      <div
        className={cn(
          'fixed left-0 top-0 w-full h-full transition-all duration-300 ease-in-out',
          isOpen && 'z-[110]',
          isOpen || showMessageNotification
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0',
        )}
        onClick={handleChatOverlayClick}
      >
        <div className="h-full flex flex-col" onClick={handleChatOverlayClick}>
          <ChatMessageList
            isOpen={isOpen}
            chatMessages={chatMessages}
            notificationMessages={notificationMessages}
            socketId={socketStore.id}
            handleMessagesListClick={handleMessagesListClick}
            messagesEndRef={messagesEndRef}
          />

          <ChatMessageInput
            isOpen={isOpen}
            handleKeyDown={handleKeyDown}
            handleSendMessage={handleSendMessage}
            inputRef={inputRef}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            maxLength={MAX_MESSAGE_LENGTH}
          />
        </div>
      </div>
    </>
  );
});
