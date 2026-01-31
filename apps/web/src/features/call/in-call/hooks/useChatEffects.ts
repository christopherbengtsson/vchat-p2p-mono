import { ChatData } from '@mono/common-dto';
import { useCallback, useEffect } from 'react';
import { CallStore } from '../../store/CallStore';

interface In {
  isOpen: boolean;
  notificationMessages: ChatData[];
  chatMessages: ChatData[];
  showMessageNotification: boolean;
  hideMessageNotification: VoidFunction;
  clearNotificationMessages: VoidFunction;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export const useChatEffects = ({
  chatMessages,
  hideMessageNotification,
  inputRef,
  isOpen,
  messagesEndRef,
  notificationMessages,
  clearNotificationMessages,
  showMessageNotification,
}: In) => {
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesEndRef]);

  useEffect(() => {
    if (isOpen) {
      clearNotificationMessages();
    }
  }, [clearNotificationMessages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom, chatMessages.length]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef, isOpen]);

  useEffect(() => {
    if (showMessageNotification && !isOpen) {
      const timeout = setTimeout(() => {
        hideMessageNotification();
      }, CallStore.CHAT_NOTIFICATION_TIMEOUT);

      return () => clearTimeout(timeout);
    }
  }, [
    showMessageNotification,
    isOpen,
    hideMessageNotification,
    notificationMessages.length,
  ]);
};
