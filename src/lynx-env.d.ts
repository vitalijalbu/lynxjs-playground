declare module '@lynx-js/types' {
  interface GlobalProps {
    /** `dark` switches to the `.mm-dark` theme. Injected by the host. */
    appTheme?: 'light' | 'dark';
    /** Initial UI language. Injected by the host. */
    locale?: 'ro' | 'ru';
    /** Safe-area insets in px. LynxExplorer does not inject them: see lib/device. */
    safeAreaTop?: number;
    safeAreaBottom?: number;
    screenWidth?: number;
    screenHeight?: number;
  }
}

// This export makes the file a module
export {};
