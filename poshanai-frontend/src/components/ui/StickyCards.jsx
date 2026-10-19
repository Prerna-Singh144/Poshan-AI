import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from 'lenis/dist/lenis-react.mjs';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const cards = [
  { eyebrow: '01 / ROOTED IN CULTURE', title: 'Rooted in Indian Food', text: 'Nutrition guidance built around the meals, ingredients, and traditions already on your table.', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1400&q=85', alt: 'A traditional Indian thali with a variety of dishes' },
  { eyebrow: '02 / CLARITY FROM DATA', title: 'AI-Powered Analysis', text: 'Turn food and report information into clear insights you can understand and discuss.', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=85', alt: 'Healthcare professional reviewing a medical report' },
  { eyebrow: '03 / MADE FOR YOU', title: 'Personalized Plans', text: 'Explore practical meal ideas that make room for your preferences and everyday routine.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=85', alt: 'A colorful balanced meal with fresh vegetables' },
];

export default function StickyCards() {
  const sectionRef = useRef(null);
  const lenis = useLenis();
  useEffect(() => {
    if (!lenis || window.innerWidth < 768) return undefined;
    const update = () => ScrollTrigger.update();
    lenis.on('scroll', update);
    return () => { lenis.off('scroll', update); };
  }, [lenis]);
  useGSAP(() => {
    if (window.innerWidth < 768) return undefined;
    const elements = gsap.utils.toArray('.sticky-feature-card', sectionRef.current);
    const triggers = elements.slice(0, -1).map((card, index) => gsap.to(card, {
      scale: 0.94,
      opacity: 0.68,
      ease: 'none',
      scrollTrigger: { trigger: elements[index + 1], start: 'top bottom', end: 'top top', scrub: true },
    }));
    return () => triggers.forEach((tween) => tween.scrollTrigger?.kill());
  }, { scope: sectionRef, dependencies: [lenis], revertOnUpdate: true });

  return (
    <section ref={sectionRef} id="benefits" className="sticky-features" aria-labelledby="sticky-features-title">
      <div className="sticky-features-heading">
        <p className="section-kicker">HOW POSHANAI HELPS</p>
        <h2 id="sticky-features-title">Better choices, <span>built from what you know.</span></h2>
      </div>
      <div className="sticky-feature-list">
        {cards.map((card, index) => (
          <article className="sticky-feature-card" key={card.title} style={{ '--card-index': index }}>
            <div className="sticky-feature-copy"><p>{card.eyebrow}</p><h3>{card.title}</h3><span>{card.text}</span><b aria-hidden="true">0{index + 1}</b></div>
            <div className="sticky-feature-image"><img src={card.image} alt={card.alt} loading="lazy" decoding="async" /></div>
          </article>
        ))}
      </div>
    </section>
  );
}
