import { render, screen } from '@testing-library/react';
import { QueueAnimationContainer } from '../../container/QueueAnimationContainer';

describe('QueueAnimationContainer', () => {
  it('should render the finding match text', () => {
    render(<QueueAnimationContainer />);

    expect(screen.getByText('Finding match...')).toBeInTheDocument();
  });

  it('should render the animated particles', () => {
    render(<QueueAnimationContainer />);

    // Each AnimatedParticle would have a unique key like 'particle-0', 'particle-1', etc.
    const particles = document.querySelectorAll('[class*="animate-"]');
    expect(particles.length).toBeGreaterThan(0);
  });
});
