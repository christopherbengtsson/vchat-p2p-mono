import { useCallback, useEffect, useRef } from 'react';
import { StarColorUtil } from '../utils/StarColorUtil';

const MAX_PARTICLES = 30;
const PARTICLE_LIFETIME_MS = 2000;

export const useCursorTrack = () => {
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const particleIndexRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const containerRef = useRef<HTMLElement | null>(null);
  const spheresRef = useRef<HTMLElement[]>([]);

  const createParticle = (clientX: number, clientY: number) => {
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 50) return; // throttle
    lastMoveTimeRef.current = now;

    if (!containerRef.current) return;

    let particle: HTMLDivElement;
    if (particlesRef.current.length < MAX_PARTICLES) {
      particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        will-change: transform, opacity;
      `;
      containerRef.current.appendChild(particle);
      particlesRef.current.push(particle);
    } else {
      particle = particlesRef.current[particleIndexRef.current];
      particleIndexRef.current = (particleIndexRef.current + 1) % MAX_PARTICLES;
    }

    const pointerX = (clientX / window.innerWidth) * 100;
    const pointerY = (clientY / window.innerHeight) * 100;

    const size = Math.random() * 4 + 2;
    const color = StarColorUtil.getRandom();

    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = color;
    particle.style.left = `${pointerX}%`;
    particle.style.top = `${pointerY}%`;
    particle.style.opacity = '0.6';
    particle.style.transform = 'translate(0,0)';
    particle.style.transition = 'none';

    // force reflow hack
    void particle.offsetHeight;

    requestAnimationFrame(() => {
      const moveX = (Math.random() - 0.5) * 80;
      const moveY = (Math.random() - 0.5) * 80;
      particle.style.transition = `transform ${PARTICLE_LIFETIME_MS}ms ease-out, opacity ${PARTICLE_LIFETIME_MS}ms ease-out`;
      particle.style.transform = `translate(${moveX}px, ${moveY}px)`;
      particle.style.opacity = '0';
    });
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    createParticle(clientX, clientY);

    if (spheresRef.current.length) {
      const moveX = (clientX / window.innerWidth - 0.5) * 5;
      const moveY = (clientY / window.innerHeight - 0.5) * 5;
      spheresRef.current.forEach((sphere) => {
        sphere.style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
    }
  }, []);

  useEffect(() => {
    containerRef.current = document.createElement('div');
    containerRef.current.className = 'particles-container';
    containerRef.current.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      transform: translateZ(0);
    `;
    document.body.appendChild(containerRef.current);

    spheresRef.current = Array.from(
      document.querySelectorAll<HTMLElement>('.gradient-sphere'),
    );

    const onMouseMove = (e: MouseEvent) =>
      handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
      }
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      particlesRef.current.forEach((p) => p.remove());
      particlesRef.current = [];
      containerRef.current?.remove();
    };
  }, [handlePointerMove]);
};
