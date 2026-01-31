import { Send } from 'lucide-react';
import { cn } from '@/common/lib/utils';
import { IS_DARK_MODE } from '@/common/utils/isDarkMode';
import { Button } from '@/common/components/ui/button';
import { Input } from '@/common/components/ui/input';

interface Props {
  isOpen: boolean;
  newMessage: string;
  setNewMessage: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  maxLength: number;
}

export function ChatMessageInput({
  isOpen,
  handleKeyDown,
  handleSendMessage,
  inputRef,
  newMessage,
  setNewMessage,
  maxLength,
}: Props) {
  return (
    <div
      className={cn(
        'p-8 border-t backdrop-blur-sm w-full',
        isOpen ? 'visible' : 'invisible',
        IS_DARK_MODE
          ? 'bottom-8 bg-background/50 rounded-t-sm'
          : 'bottom-0 bg-muted-foreground/50 rounded-t-sm',
      )}
      data-testid="chat-message-input-wrapper"
    >
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder="Type a message..."
          className="flex-1 bg-black text-white placeholder-white/50"
        />

        <Button
          aria-label="Send Message"
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
