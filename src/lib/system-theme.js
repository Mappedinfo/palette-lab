export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
const systemMedia = () => typeof window === 'undefined' ? null : window.matchMedia(SYSTEM_THEME_QUERY);
export function getSystemTheme(media = systemMedia()) { return media?.matches ? 'dark' : 'light'; }
export function subscribeSystemTheme(listener, media = systemMedia()) {
  if (!media) return () => {};
  if (media.addEventListener) {
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }
  media.addListener(listener);
  return () => media.removeListener(listener);
}
