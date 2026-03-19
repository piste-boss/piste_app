"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-4xl">⚠️</span>
          <h3 className="mt-4 text-lg font-semibold">
            エラーが発生しました
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {this.state.error?.message || "予期せぬエラーが発生しました"}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4"
            variant="outline"
          >
            再試行
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
