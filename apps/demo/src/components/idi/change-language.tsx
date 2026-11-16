import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useState } from 'react';
import { Check, X } from 'lucide-react';

const languageSchema = schema.enum([
  'english',
  'german',
  'spanish',
  'hungarian',
]);
type Language = schema.infer<typeof languageSchema>;
const languages: Record<
  Language,
  { name: string; flag: string; changeText: string }
> = {
  english: {
    name: 'English',
    flag: '🇺🇸',
    changeText: 'Set language to English',
  },
  german: {
    name: 'Deutsch',
    flag: '🇩🇪',
    changeText: 'Sprache auf Deutsch einstellen',
  },
  spanish: {
    name: 'Español',
    flag: '🇪🇸',
    changeText: 'Establecer idioma a Español',
  },
  hungarian: {
    name: 'Magyar',
    flag: '🇭🇺',
    changeText: 'Nyelv beállítása magyarra',
  },
};

export const changeLanguage = defineIDIComponent({
  description:
    'Open a demo language picker for English, German, Spanish, or Hungarian. The user can change the selection and confirm it or cancel. Confirmation records a preference for the conversation; it does not translate the application itself.',
  inputSchema: schema.object({
    preferredLanguage: languageSchema
      .nullable()
      .describe(
        'Preselect the requested language, or null to start with English.'
      ),
  }),
  outputSchema: schema.discriminatedUnion('status', [
    schema.object({
      status: schema.literal('confirmed'),
      selectedLanguage: languageSchema,
    }),
    schema.object({ status: schema.literal('cancelled') }),
  ]),
  component: function ChangeLanguage({
    componentInput,
    setComponentInputState,
    closeComponent,
  }) {
    const selected = componentInput.preferredLanguage ?? 'english';
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="flex flex-col">
        {/* Keep the selected language as editable input so reopening restores it. */}
        <div className="relative mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Select language"
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-lg leading-none">
                {languages[selected].flag}
              </span>
              <span>{languages[selected].name}</span>
            </span>
            <svg
              className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isOpen && (
            <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              <div className="max-h-48 overflow-y-auto">
                {languageSchema.options.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => {
                      setComponentInputState({ preferredLanguage: language });
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-primary/10 ${selected === language ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                  >
                    <span className="text-lg leading-none">
                      {languages[language].flag}
                    </span>
                    <span>{languages[language].name}</span>
                    {selected === language && (
                      <Check className="ml-auto h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              void closeComponent({
                setComponentOutput: { status: 'cancelled' },
              })
            }
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              void closeComponent({
                setComponentOutput: {
                  status: 'confirmed',
                  selectedLanguage: selected,
                },
              })
            }
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" />
            {languages[selected].changeText}
          </button>
        </div>
      </div>
    );
  },
  componentSummary: function LanguageSummary({ componentInput }) {
    return (
      <span>
        Language ·{' '}
        {languages[componentInput.preferredLanguage ?? 'english'].name}
      </span>
    );
  },
  outputSummary: function LanguageResult(output) {
    return (
      <span>
        {output.status === 'cancelled'
          ? 'Cancelled'
          : `Selected ${languages[output.selectedLanguage].name}`}
      </span>
    );
  },
});
