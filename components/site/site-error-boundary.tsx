'use client';

import {
  Component,
  ReactNode,
} from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class SiteErrorBoundary
  extends Component<Props, State> {

  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError():
    State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: unknown
  ) {
    const path =
      typeof window !== 'undefined'
        ? window.location.pathname
        : '';

    fetch(
      '/api/page-errors',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            path,

            message:
              error.message,

            stack:
              error.stack || '',

            source:
              'react-error-boundary',

            userAgent:
              typeof navigator !==
              'undefined'
                ? navigator.userAgent
                : '',
          }),
      }
    ).catch(
      () => {}
    );

    console.error(
      'Public page error:',
      error,
      info
    );
  }

  render() {
    if (
      this.state.hasError
    ) {
      return (
        <div className="min-h-screen bg-background px-5 py-20 text-foreground">
          <div className="ac-content-panel mx-auto max-w-xl p-8 text-center">

            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              TEMPORARILY UNAVAILABLE
            </div>

            <h1 className="mt-3 text-3xl font-semibold">
              This page encountered a problem.
            </h1>

            <p className="mt-4 text-sm leading-7 text-foreground-muted">
              We detected an unexpected issue and have
              recorded it for review.
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-7 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Reload Page
            </button>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
