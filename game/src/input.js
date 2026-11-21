// Keyboard and mouse input for Solano Bay. Held keys give a move vector;
// one-shot presses (confirm, pause, enter car, punch, mute) are queued as bit
// flags and taken once by the loop, so a press between frames is never lost.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE', 'KeyF']);
const PUNCH = new Set(['Space']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  function press(code, event) {
    if (CONFIRM.has(code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(code)) actions |= ACTION_PAUSE;
    else if (ENTER_CAR.has(code)) actions |= ACTION_ENTER_CAR;
    else if (PUNCH.has(code)) actions |= ACTION_PUNCH;
    else if (MUTE.has(code)) actions |= ACTION_MUTE;
    else return;
    event.preventDefault();
  }

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (!event.repeat) press(event.code, event);
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || PUNCH.has(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    mouseClicked = true;
    event.preventDefault();
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  function axis(neg, pos) {
    const has = (set) => [...set].some((c) => keys.has(c));
    return (has(pos) ? 1 : 0) - (has(neg) ? 1 : 0);
  }

  return {
    get moveX() { return axis(LEFT, RIGHT); },
    get moveY() { return axis(UP, DOWN); },
    get sprint() { return [...SPRINT].some((c) => keys.has(c)); },
    get mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeMouseClick() {
      const clicked = mouseClicked;
      mouseClicked = false;
      return clicked;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
