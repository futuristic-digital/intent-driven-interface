'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/ui/button';
import { cn } from '@/utils/cn';
import { useDemoAIAvailable } from '../domain/demo-ai-context';

const suggestions = [
  'Show delayed shipments on a map.',
  'Choose an afternoon delivery slot for shp-1 next Friday.',
  'Compare carriers for shp-1 delivering by next Thursday.',
  'Let the customer know shipment shp-2 is delayed.',
  'Sign me out.',
];

export function ChatInput({
  onSendMessage,
  disabled,
  generationFailed,
  updateFailed,
}: {
  onSendMessage: (text: string) => Promise<void>;
  disabled?: boolean;
  generationFailed: boolean;
  updateFailed: boolean;
}) {
  const aiAvailable = useDemoAIAvailable();
  const [input, setInput] = useState('');
  const [sendFailed, setSendFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || disabled || !aiAvailable) return;
    const draft = input;
    setSendFailed(false);
    setInput('');
    try {
      await onSendMessage(draft.trim());
    } catch {
      setInput((current) => current || draft);
      setSendFailed(true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!e.repeat) void handleSubmit();
    }
  };

  const errorMessage =
    generationFailed || sendFailed
      ? 'Flowdock couldn’t generate a reply. Try your prompt again.'
      : updateFailed
        ? 'Couldn’t save the latest change in chat. Please try again.'
        : '';

  return (
    <div className="max-h-1/2 shrink-0 overflow-y-auto border-t border-border/50 bg-card/50 p-4 pb-2 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl">
        <p role="alert" className="mb-2 text-sm text-destructive empty:m-0">
          {errorMessage}
        </p>
        {aiAvailable ? (
          <>

            <div
              aria-label="Example prompts"
              className="mb-3 flex gap-2 overflow-x-auto p-1 sm:flex-wrap"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setInput(suggestion);
                    textareaRef.current?.focus();
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1.5 text-left text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <Sparkles className="size-3 shrink-0" aria-hidden="true" />
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="relative flex items-end gap-2 rounded-2xl border border-border/50 bg-input/50 p-2 has-[textarea:focus]:border-ring has-[textarea:focus]:ring-2 has-[textarea:focus]:ring-ring">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Ask Flowdock"
                placeholder="Ask about a shipment…"
                className="max-h-[120px] min-h-[40px] min-w-0 flex-1 resize-none bg-transparent py-2 pl-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                rows={1}
                maxLength={2_000}
                readOnly={disabled}
              />

              <Button
                type="button"
                onClick={(event) => {
                  if (event.detail === 0) textareaRef.current?.focus();
                  void handleSubmit();
                }}
                disabled={!input.trim() || disabled}
                size="icon"
                className={cn(
                  'h-9 w-9 shrink-0 rounded-xl transition-all',
                  input.trim() && !disabled
                    ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,200,0.3)]'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Live AI is unavailable.
          </p>
        )}

        {/* Footer Info */}
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          <span className="tracking-wider">intent-driven interface - by</span>{' '}
          <a
            href="https://futuristic.digital"
            target="_blank"
            className="font-montserrat font-bold text-primary underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            futuristic
          </a>
        </p>
      </div>
    </div>
  );
}
