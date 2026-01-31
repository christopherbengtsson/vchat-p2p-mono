import { cn } from '@/common/lib/utils';

interface Props {
  message: string;
  isOwnMessage: boolean;
}

export function ChatBubble({ message, isOwnMessage }: Props) {
  return (
    <div
      className={cn(
        'flex mb-2 animate-in slide-in-from-bottom-2 duration-300',
        isOwnMessage ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'relative px-4 py-2.5 rounded-2xl break-words',
          'min-w-[60px] max-w-[85%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[75%] xl:max-w-[75%]',
          isOwnMessage
            ? 'ml-8 sm:ml-12 md:ml-16 lg:ml-12 xl:ml-10'
            : 'mr-8 sm:mr-12 md:mr-16 lg:mr-12 xl:mr-10',
          isOwnMessage ? 'liquid-glass' : 'bg-background/50 text-foreground',
        )}
      >
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
