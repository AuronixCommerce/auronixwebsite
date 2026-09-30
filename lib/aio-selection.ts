export const AIO_SELECTION_EVENT = 'auronix:aio-selection';

export type AioSelectionRequest = {
  id: string;
  prompt: string;
};

export function askAioAboutSelection(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (!normalized || typeof window === 'undefined') {
    return;
  }

  const excerpt = normalized.length > 3600
    ? `${normalized.slice(0, 3600).trimEnd()}…`
    : normalized;

  const request: AioSelectionRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    prompt: `Explain this selected text clearly in the context of Auronix Commerce:\n\n“${excerpt}”`,
  };

  window.dispatchEvent(
    new CustomEvent<AioSelectionRequest>(AIO_SELECTION_EVENT, {
      detail: request,
    })
  );
}
