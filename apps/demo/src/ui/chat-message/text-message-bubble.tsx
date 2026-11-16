import type { TextUIPart } from '@intent-driven-interface/frontend';
import { cn } from '../../utils/cn';
import { Bot, User } from 'lucide-react';
import { ChatMessageTimestamp } from './chat-message-timestamp';

/** Text and its timestamp share the same alignment on either side of the chat. */
export function TextMessageBubble({
  isAssistant,
  timestamp,
  textPart,
}: {
  isAssistant: boolean;
  timestamp: string;
  textPart: TextUIPart;
}) {
  return (
    <div className="space-y-2">
      <p
        className={cn(
          'flex min-h-8 items-center text-xs font-mono text-muted-foreground',
          isAssistant ? 'pl-11' : 'justify-end pr-11'
        )}
      >
        <ChatMessageTimestamp timestamp={timestamp} />
      </p>
      <div
        className={cn(
          'flex gap-3',
          isAssistant ? 'justify-start' : 'justify-end'
        )}
      >
        {isAssistant && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/30">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        )}
        <div
          className={cn(
            'max-w-[80%] rounded-2xl px-4 py-3',
            isAssistant
              ? 'bg-card border border-border/50 rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm'
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {textPart.text}
          </p>
        </div>

        {!isAssistant && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border/50">
            <User className="h-4 w-4 text-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
