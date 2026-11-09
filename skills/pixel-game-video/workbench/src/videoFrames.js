/** @param {number[]} ticks @param {number} timeBase @param {number} seconds */
export function sourceFrameAt(ticks, timeBase, seconds) {
  // The demuxer's integer time base can round a nominal time by half a tick.
  const target = Math.round(seconds / timeBase);
  let first = 0;
  let last = ticks.length;
  while (first < last) {
    const middle = (first + last) >>> 1;
    if (ticks[middle] <= target) first = middle + 1;
    else last = middle;
  }
  return ticks[Math.max(0, first - 1)];
}
