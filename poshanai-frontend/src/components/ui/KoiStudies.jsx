import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Grip } from 'lucide-react';
import { cardsData } from '../../data/landingCards.js';
import './koi-studies.css';

export default function KoiStudies() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);
  const wheelLock = useRef(false);
  const active = cardsData[currentIndex];
  const counter = `${String(currentIndex + 1).padStart(2, '0')} / ${String(cardsData.length).padStart(2, '0')}`;

  const changeCard = (direction) => {
    setCurrentIndex((index) => (index + direction + cardsData.length) % cardsData.length);
  };

  const onPointerDown = (event) => {
    dragStart.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerUp = (event) => {
    if (dragStart.current === null) return;
    const delta = event.clientX - dragStart.current;
    if (Math.abs(delta) > 36) changeCard(delta < 0 ? 1 : -1);
    dragStart.current = null;
  };

  const onPointerMove = (event) => {
    if (dragStart.current !== null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - rect.top) / rect.height - 0.5) * -5,
      y: ((event.clientX - rect.left) / rect.width - 0.5) * 7,
    });
  };

  const onWheel = (event) => {
    if (wheelLock.current || Math.abs(event.deltaY) < 12) return;
    changeCard(event.deltaY > 0 ? 1 : -1);
    wheelLock.current = true;
    window.setTimeout(() => { wheelLock.current = false; }, 450);
  };

  return (
    <section className="ingredient-study" aria-labelledby="ingredient-study-title">
      <div className="ingredient-study__intro">
        <p className="ingredient-study__eyebrow">NOURISHMENT, YOUR WAY</p>
        <h2 id="ingredient-study-title">Good nutrition starts with familiar food.</h2>
        <p>Explore the everyday ingredients that make a balanced plate.</p>
      </div>

      <div
        className="ingredient-deck"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        onWheel={onWheel}
      >
        <div className="ingredient-deck__stack">
          {Array.from({ length: cardsData.length - 1 }, (_, index) => cardsData.length - 1 - index).map((depth) => {
            const card = cardsData[(currentIndex + depth) % cardsData.length];
            return (
              <div
                key={`${card.id}-${depth}`}
                className="ingredient-card ingredient-card--back"
                style={{ '--stack-depth': depth, '--card-accent': card.color }}
                aria-hidden="true"
              />
            );
          })}
          <article
            className="ingredient-card ingredient-card--active"
            style={{ '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg`, '--card-accent': active.color }}
            aria-live="polite"
          >
            <div className="ingredient-card__top">
              <span>{active.header}</span>
              <span aria-label={`Card ${counter}`}>{counter}</span>
            </div>
            <div className="ingredient-card__mark" aria-hidden="true">{active.iconText}</div>
            <div className="ingredient-card__bottom">
              <h3>{active.title}</h3>
              <p>{active.description}</p>
            </div>
            <Grip className="ingredient-card__grip" size={19} aria-hidden="true" />
          </article>
        </div>

        <div className="ingredient-deck__controls">
          <span>Drag, scroll, or use the arrows</span>
          <div>
            <button type="button" aria-label="Previous card" onClick={() => changeCard(-1)}><ArrowLeft size={18} /></button>
            <button type="button" aria-label="Next card" onClick={() => changeCard(1)}><ArrowRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
