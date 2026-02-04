import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

const STORAGE_KEYS_TO_CLEAR = [
  "navigation_state",
  "currentVenueId",
  // form drafts are prefixed; we'll clear them by prefix on reset
];

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep logs concise but actionable.
    console.error("[AppErrorBoundary] Caught error:", error);
    console.error("[AppErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  private reset = () => {
    try {
      for (const key of STORAGE_KEYS_TO_CLEAR) {
        localStorage.removeItem(key);
      }
      // Clear form drafts
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("form_draft_")) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }

    // Hard reload to ensure we escape any stuck render loop.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            O app entrou em um loop de renderização (erro React #185). Você pode limpar o cache local e recarregar.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Limpar cache e recarregar
          </button>

          {this.state.error?.message && (
            <pre className="mt-2 w-full overflow-auto rounded-md border bg-muted/30 p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
