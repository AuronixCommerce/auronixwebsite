'use client';

import {
  Check,
  Copy,
  Sparkles,
  TextSelect,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

import { askAioAboutSelection } from '@/lib/aio-selection';

type SelectionState = {
  text: string;
  rect: DOMRect;
};

function isEditableSelection(selection: Selection) {
  const node = selection.anchorNode;
  const element = node instanceof Element ? node : node?.parentElement;

  return Boolean(
    element?.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"], [data-no-selection-actions]'
    )
  );
}

function getVisibleSelectionRect(range: Range) {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const visibleRect = Array.from(range.getClientRects()).find(
    (rect) =>
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 8 &&
      rect.top < viewportHeight - 8
  );

  return visibleRect ?? range.getBoundingClientRect();
}

function copyWithSelectionFallback(text: string) {
  const selection = window.getSelection();
  const savedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange()
      )
    : [];
  const copyTarget = document.createElement('textarea');

  copyTarget.value = text;
  copyTarget.setAttribute('readonly', '');
  copyTarget.style.position = 'fixed';
  copyTarget.style.left = '-9999px';
  copyTarget.style.opacity = '0';
  document.body.appendChild(copyTarget);
  copyTarget.select();

  const copied = document.execCommand('copy');

  copyTarget.remove();

  if (selection && savedRanges.length > 0) {
    selection.removeAllRanges();
    savedRanges.forEach((range) => selection.addRange(range));
  }

  return copied;
}

export function SelectionActions() {
  const pathname = usePathname();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const updateTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const [copied, setCopied] = useState(false);

  const readSelection = useCallback(() => {
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      selection.rangeCount === 0 ||
      isEditableSelection(selection)
    ) {
      setSelectionState(null);
      setCopied(false);
      return;
    }

    const text = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const ancestorElement = ancestor instanceof Element
      ? ancestor
      : ancestor.parentElement;

    if (
      !text ||
      ancestorElement?.closest('[data-selection-actions]') ||
      !ancestorElement?.closest('#main-content')
    ) {
      setSelectionState(null);
      setCopied(false);
      return;
    }

    const rect = getVisibleSelectionRect(range);

    if (!rect.width && !rect.height) {
      setSelectionState(null);
      return;
    }

    setSelectionState({ text, rect });
    setCopied(false);
  }, []);

  const scheduleSelectionRead = useCallback(() => {
    if (updateTimerRef.current !== null) {
      window.clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = window.setTimeout(readSelection, 90);
  }, [readSelection]);

  useEffect(() => {
    const hide = () => setSelectionState(null);
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
        window.getSelection()?.removeAllRanges();
        return;
      }

      scheduleSelectionRead();
    };

    document.addEventListener('selectionchange', scheduleSelectionRead);
    document.addEventListener('pointerup', scheduleSelectionRead);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.visualViewport?.addEventListener('resize', hide);

    return () => {
      document.removeEventListener('selectionchange', scheduleSelectionRead);
      document.removeEventListener('pointerup', scheduleSelectionRead);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.visualViewport?.removeEventListener('resize', hide);

      if (updateTimerRef.current !== null) {
        window.clearTimeout(updateTimerRef.current);
      }

      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, [scheduleSelectionRead]);

  useEffect(() => {
    setSelectionState(null);
  }, [pathname]);

  const selectAllContent = () => {
    const content = document.querySelector('#main-content');
    const selection = window.getSelection();

    if (!content || !selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(content);
    selection.removeAllRanges();
    selection.addRange(range);
    window.setTimeout(readSelection, 0);
  };

  const copySelection = async () => {
    if (!selectionState?.text) {
      return;
    }

    try {
      let didCopy = false;

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(selectionState.text);
          didCopy = true;
        } catch {
          // Some embedded and privacy-restricted browsers deny Clipboard API
          // access even during a user gesture. The selection fallback below
          // preserves the original page selection while copying its text.
        }
      }

      if (!didCopy) {
        didCopy = copyWithSelectionFallback(selectionState.text);
      }

      if (!didCopy) {
        throw new Error('Copy is unavailable');
      }

      setCopied(true);

      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }

      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const askAio = () => {
    if (!selectionState?.text) {
      return;
    }

    askAioAboutSelection(selectionState.text);
    setSelectionState(null);
    window.getSelection()?.removeAllRanges();
  };

  if (!selectionState) {
    return null;
  }

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const toolbarWidth = Math.min(286, viewportWidth - 24);
  const halfWidth = toolbarWidth / 2;
  const selectionCenter = selectionState.rect.left + selectionState.rect.width / 2;
  const left = Math.max(
    halfWidth + 12,
    Math.min(viewportWidth - halfWidth - 12, selectionCenter)
  );
  const placeAbove = selectionState.rect.top > 64;
  const top = placeAbove
    ? Math.min(viewportHeight - 12, selectionState.rect.top - 10)
    : Math.min(viewportHeight - 52, selectionState.rect.bottom + 10);

  return (
    <div
      ref={toolbarRef}
      data-selection-actions
      data-placement={placeAbove ? 'above' : 'below'}
      role="toolbar"
      aria-label="Selected text actions"
      className="ac-selection-actions"
      style={{ left, top }}
      onPointerDown={(event) => event.preventDefault()}
    >
      <button type="button" onClick={selectAllContent} aria-label="Select all page content">
        <TextSelect aria-hidden="true" />
        <span>Select all</span>
      </button>

      <button type="button" onClick={() => void copySelection()} aria-label={copied ? 'Copied' : 'Copy selected text'}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <button type="button" onClick={askAio} aria-label="Ask Auronix Intelligence One about selected text" className="ac-selection-ask">
        <Sparkles aria-hidden="true" />
        <span>Ask AIO</span>
      </button>

      <span className="sr-only" aria-live="polite">
        {copied ? 'Selected text copied to clipboard.' : ''}
      </span>
    </div>
  );
}
