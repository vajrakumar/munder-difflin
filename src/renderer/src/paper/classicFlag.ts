/** Classic UI flag (MDF-8). Default ON so the pixel app is unchanged.
 *  Force Paper with `?paper=1`. Force classic with `?classic=1`.
 *  Persist with localStorage `paper.classicUi` = '1' | '0'. */

const KEY = 'paper.classicUi';

export function isClassicUi(): boolean {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('paper') === '1') return false;
    if (q.get('classic') === '1') return true;
    const v = window.localStorage.getItem(KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch { /* storage / window unavailable */ }
  return true;
}

export function setClassicUi(on: boolean): void {
  try { window.localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* noop */ }
  const url = new URL(window.location.href);
  url.searchParams.delete('paper');
  url.searchParams.delete('classic');
  window.location.replace(url.toString());
}
