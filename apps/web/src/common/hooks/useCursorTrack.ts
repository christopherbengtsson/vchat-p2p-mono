import { useEffect } from 'react';

const handlePointerMove = (clientX: number, clientY: number) => {
  // Create particles at pointer position
  const pointerX = (clientX / window.innerWidth) * 100;
  const pointerY = (clientY / window.innerHeight) * 100;

  // Find particles container
  const particlesContainer = document.querySelector('.particles-container');
  if (!particlesContainer) return;

  // Create temporary particle
  const particle = document.createElement('div');
  particle.className = 'particle';

  // Small size
  const size = Math.random() * 4 + 2;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;

  // Position at pointer
  particle.style.left = `${pointerX}%`;
  particle.style.top = `${pointerY}%`;
  particle.style.opacity = '0.6';

  particlesContainer.appendChild(particle);

  // Animate outward
  setTimeout(() => {
    particle.style.transition = 'all 2s ease-out';
    particle.style.left = `${pointerX + (Math.random() * 10 - 5)}%`;
    particle.style.top = `${pointerY + (Math.random() * 10 - 5)}%`;
    particle.style.opacity = '0';

    // Remove after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.remove();
      }
    }, 2000);
  }, 10);

  // Subtle movement of gradient spheres
  const spheres = document.querySelectorAll('.gradient-sphere');
  const moveX = (clientX / window.innerWidth - 0.5) * 5;
  const moveY = (clientY / window.innerHeight - 0.5) * 5;

  spheres.forEach((sphere) => {
    (sphere as HTMLElement).style.transform =
      `translate(${moveX}px, ${moveY}px)`;
  });
};

const handleMouseMove = (e: MouseEvent) => {
  handlePointerMove(e.clientX, e.clientY);
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    handlePointerMove(touch.clientX, touch.clientY);
  }
};

export const useCursorTrack = () => {
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
};
