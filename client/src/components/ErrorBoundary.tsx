/* Quiet Signal recovery: protect visitors from internal failure details and give them one calm way forward. */
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="ct-system-page" aria-labelledby="recovery-title">
          <section className="ct-system-card">
            <span className="ct-system-icon"><AlertTriangle size={23} /></span>
            <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> A calm reset</p>
            <h1 id="recovery-title">We couldn’t open that practice space.</h1>
            <p>Nothing has been shown from the session here. Try reloading, or return to your private practice home.</p>
            <div className="ct-system-actions">
              <button type="button" className="ct-button" onClick={() => window.location.reload()}><RotateCcw size={16} /> Reload safely</button>
              <button type="button" className="ct-button ct-button--secondary" onClick={() => { window.location.href = "/"; }}><ArrowLeft size={16} /> Back to home</button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
