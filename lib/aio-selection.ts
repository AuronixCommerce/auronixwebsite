export const AIO_SELECTION_EVENT = 'auronix:aio-selection';

export type AioSelectionRequest = {
  id: string;
  prompt: string;
  selectedText?: string;
};

export function openAio(prompt: string, selectedText?: string) {
  const normalizedPrompt = prompt.replace(/\s+/g, ' ').trim();

  if (!normalizedPrompt || typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AioSelectionRequest>(AIO_SELECTION_EVENT, {
      detail: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        prompt: normalizedPrompt,
        selectedText,
      },
    })
  );
}

export function askAioAboutSelection(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (!normalized || typeof window === 'undefined') {
    return;
  }

  const excerpt = normalized.length > 3600
    ? `${normalized.slice(0, 3600).trimEnd()}…`
    : normalized;

  openAio(
    `Explain this selected text clearly in the context of Auronix Commerce:\n\n“${excerpt}”`,
    excerpt
  );
}
