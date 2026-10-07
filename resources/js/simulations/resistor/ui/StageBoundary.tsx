import { Component, ReactNode } from "react";

type Props = { children: ReactNode; onError: (message: string) => void };
type State = { failed: boolean };

/**
 * If the 3D stage cannot start (lost WebGL context, a model that will not
 * load, an old GPU driver), the lab drops to the 2D bench instead of a blank
 * box. The chapters and checkpoints never depend on the 3D stage.
 */
export default class StageBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.props.onError(`The 3D bench could not start (${detail.slice(0, 120)}). Switched to the light 2D bench.`);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
