/**
 * Screen metrics and safe-area insets.
 *
 * Lynx has no `env(safe-area-inset-*)`: hosts should inject the real insets as
 * `safeAreaTop` / `safeAreaBottom` global props. Until they do (LynxExplorer
 * in full-screen mode), fall back to typical notch/home-indicator values.
 */
function globalProps() {
  return lynx.__globalProps ?? {};
}

function platform(): string {
  return typeof SystemInfo === 'undefined' ? '' : String(SystemInfo.platform ?? '');
}

export function screenWidth(): number {
  const props = globalProps();
  if (props.screenWidth) return props.screenWidth;
  if (typeof SystemInfo !== 'undefined' && SystemInfo.pixelWidth && SystemInfo.pixelRatio) {
    return SystemInfo.pixelWidth / SystemInfo.pixelRatio;
  }
  return 375;
}

export function safeAreaTop(): number {
  const props = globalProps();
  if (typeof props.safeAreaTop === 'number') return props.safeAreaTop;
  return platform() === 'iOS' ? 54 : 28;
}

export function safeAreaBottom(): number {
  const props = globalProps();
  if (typeof props.safeAreaBottom === 'number') return props.safeAreaBottom;
  return platform() === 'iOS' ? 28 : 8;
}
