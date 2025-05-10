export const HEART_ANIMATION = {
  TOTAL_HEARTS: 4,
  BASE_SIZE_MULTIPLIER: 0.8, // Size of first heart relative to player
  SIZE_INCREMENT: 0.3, // How much each heart grows
  OFFSET_X: 0.2, // X offset from player center (rightward)
  OFFSET_Y: -0.4, // Y offset from player top (upward)
  BASE_VERTICAL_SPACING: 1.1, // Base vertical spacing factor
  HORIZONTAL_OFFSET_PER_HEART: 0.2, // How much each heart shifts right relative to previous one

  // Base timing values
  START_DELAY_FRAMES: 50, // Delay before hearts start appearing
  HEART_DELAY_FRAMES: 50, // Frames between each heart appearing
  START_BLINK_DELAY: 50, // Start blinking after last heart + delay
  BLINK_DURATION_FRAMES: 80, // How long the blink lasts
  FADE_OUT_DELAY_FRAMES: 30, // Start fading after blink ends + delay
  FADE_OUT_DURATION_FRAMES: 30, // How long fade out lasts

  // Derived timing values using arithmetic expressions
  get LAST_HEART_APPEAR_FRAME() {
    return (
      this.START_DELAY_FRAMES +
      (this.TOTAL_HEARTS - 1) * this.HEART_DELAY_FRAMES
    );
  },

  get BLINK_START_FRAME() {
    return this.LAST_HEART_APPEAR_FRAME + this.START_BLINK_DELAY;
  },

  get BLINK_END_FRAME() {
    return this.BLINK_START_FRAME + this.BLINK_DURATION_FRAMES;
  },

  get FADE_OUT_START_FRAME() {
    return this.BLINK_END_FRAME + this.FADE_OUT_DELAY_FRAMES;
  },

  get TOTAL_ANIMATION_FRAMES() {
    return this.FADE_OUT_START_FRAME + this.FADE_OUT_DURATION_FRAMES;
  },
};
