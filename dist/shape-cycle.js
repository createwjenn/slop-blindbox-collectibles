export const shapeNames = ['box', 'organic', 'pyramid', 'cylinder'];
export function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

// Each completed form rests for five seconds before a three-second morph.
export function getShapeState(seconds, reducedMotion = false) {
  const phase = Math.max(0, seconds) % 32;
  const from = Math.floor(phase / 8);
  const to = (from + 1) % shapeNames.length;
  const localTime = phase % 8;
  const blend = reducedMotion ? Number(localTime >= 5) : smoothstep((localTime - 5) / 3);
  const weights = [0, 0, 0, 0];
  weights[from] = 1 - blend;
  weights[to] = blend;
  return { weights, from, to, blend };
}
