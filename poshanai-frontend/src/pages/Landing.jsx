import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import logo from '../assets/logo.svg';
import { ReactLenis } from 'lenis/dist/lenis-react.mjs';
const StickyCards = lazy(() => import('../components/ui/StickyCards.jsx'));

function BalancedPlate() {
  return (
    <div className="plate-scene" aria-label="Illustration of a colourful balanced meal">
      <div className="plate-shadow" />
      <div className="plate">
        <div className="plate-rim">
          <div className="plate-food">
            <span className="food food-tomato" />
            <span className="food food-tomato food-tomato-small" />
            <span className="food food-carrot" />
            <span className="food food-grain" />
            <span className="food food-bean" />
            <span className="food food-herb food-herb-one">✿</span>
            <span className="food food-herb food-herb-two">✿</span>
            <span className="food food-herb food-herb-three">✿</span>
          </div>
        </div>
      </div>
      <div className="floating-note note-fibre">
        <span className="note-icon">✳</span>
        <span>
          <strong>More goodness</strong>
          <small>Fibre-rich greens</small>
        </span>
      </div>
      <div className="floating-note note-balance">
        <span className="balance-icon">✓</span>
        <span>
          <strong>A little balance</strong>
          <small>Made for your day</small>
        </span>
      </div>
      <span className="scene-sparkle sparkle-one" aria-hidden="true">✳</span>
      <span className="scene-sparkle sparkle-two" aria-hidden="true">✦</span>
      <span className="scene-leaf leaf-one" aria-hidden="true" />
      <span className="scene-leaf leaf-two" aria-hidden="true" />
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const actionHref = isAuthenticated ? '/dashboard' : '/register';
  const actionLabel = isAuthenticated ? 'Go to your dashboard' : 'Get started for free';

  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
    <main className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="PoshanAI home">
          <img src={logo} alt="" />
          <span>poshan<span className="brand-ai">ai</span></span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#approach">Our approach</a>
          <a href="#benefits">Why PoshanAI</a>
        </nav>
        <div className="landing-header-actions">
          <Link className="landing-login" to={isAuthenticated ? '/dashboard' : '/login'}>
            {isAuthenticated ? 'Dashboard' : 'Log in'}
          </Link>
          <Link className="landing-small-cta" to={actionHref}>
            {isAuthenticated ? 'Open app' : 'Join us'} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className="landing-hero" id="approach">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span /> NUTRITION, MADE PERSONAL</div>
          <h1>
            Eat well.
            <br />
            <span>Feel more</span> like you.
          </h1>
          <p className="hero-description">
            A little more clarity. A little more balance. Discover a way of eating well that feels
            like <em>yours</em> — one everyday meal at a time.
          </p>
          <div className="hero-actions">
            <Link className="hero-primary" to={actionHref}>
              {actionLabel} <span aria-hidden="true">↗</span>
            </Link>
            <a className="hero-secondary" href="#benefits">
              Discover PoshanAI <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-footnote">
            <span className="footnote-stars" aria-hidden="true">✳ ✳ ✳</span>
            <span>Thoughtful nutrition for everyday Indian meals</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-halo" />
          <BalancedPlate />
          <div className="art-caption">
            <span className="caption-dot" />
            Good food, good energy
          </div>
        </div>
        <span className="hero-index" aria-hidden="true">01 / 03</span>
      </section>

      <Suspense fallback={<section className="sticky-features" aria-label="PoshanAI features" />}><StickyCards /></Suspense>
      <footer className="landing-footer">
        <Link to="/" className="footer-brand">poshan<span>ai</span></Link>
        <p>Good food is personal. Your wellness journey should be, too.</p>
        <span>Made with care, for every plate. <span aria-hidden="true">✳</span></span>
      </footer>
    </main>
    </ReactLenis>
  );
}
