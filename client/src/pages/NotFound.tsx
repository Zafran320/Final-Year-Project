/* Quiet Signal recovery: a missing route is treated as a quiet detour, never a generic template failure. */
import { ArrowLeft, Compass } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <main className="ct-system-page ct-page-transition" aria-labelledby="not-found-title">
      <section className="ct-system-card">
        <span className="ct-system-icon"><Compass size={23} /></span>
        <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> Private practice space</p>
        <h1 id="not-found-title">That page isn’t part of this session.</h1>
        <p>The link may have changed, or the practice step is no longer available. Your next useful place is the CareerTwin AI home.</p>
        <div className="ct-system-actions"><button className="ct-button" type="button" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Return home</button></div>
      </section>
    </main>
  );
}
