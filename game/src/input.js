// input.js — keyboard + mouse input state. Tracks held keys, mouse position in
// screen space, and one-shot "just pressed" edges consumed by the game loop.

export const keys = new Set();
const pressedThisFrame = new Set();

export const mouse = {
  x: 0, y: 0,          // screen coords
  wx: 0, wy: 0,        // world coords (filled in by camera each frame)
  down: false,
  clicked: false,      // one-shot
};

const KEY_ALIASES = {
  'up': 'w', 'arrowup': 'w',
  'down': 's', 'arrowdown': 's',
  'left': 'a', 'arrowleft': 'a',
  'right': 'd', 'arrowright': 'd',
};

export function keyOf(e) {
  const k = e.key.toLowerCase();
  return KEY_ALIASES[k] || k;
}

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const k = keyOf(e);
    if (!keys.has(k)) pressedThisFrame.add(k);
    keys.add(k);
    if (['w', 'a', 's', 'd', ' ', 'tab'].includes(k)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(keyOf(e)));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function pressed(k) { return pressedThisFrame.has(k); }
export function holding(k) { return keys.has(k); }

// Called at the end of each frame: clears one-shot state.
export function endFrameInput() {
  pressedThisFrame.clear();
  mouse.clicked = false;
}
