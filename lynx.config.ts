import { createRequire } from 'node:module';
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { defineConfig } from '@lynx-js/rspeedy';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

const require = createRequire(import.meta.url);

export default defineConfig({
  source: {
    alias: {
      // TanStack Router/Query need the React 18 API surface (startTransition,
      // useSyncExternalStore...), which ReactLynx exposes through `compat`.
      react$: require.resolve('@lynx-js/react/compat'),
    },
  },
  plugins: [
    pluginQRCode({
      schema(url) {
        // We use `?fullscreen=true` to open the page in LynxExplorer in full screen mode
        return `${url}?fullscreen=true`;
      },
    }),
    pluginReactLynx({
      // Required by lynx-ui gesture-based components (Sheet, Swiper...).
      enableNewGesture: true,
      // Lets `text-*` / `font-*` utilities cascade like on the web, so a
      // themed container colours every nested <text>.
      enableCSSInheritance: true,
    }),
    pluginTypeCheck(),
  ],
  tools: {
    rspack: {
      plugins: [
        tanstackRouter({
          target: 'react',
          routesDirectory: './src/routes',
          generatedRouteTree: './src/routeTree.gen.ts',
          // Lynx ships one bundle: route-level code splitting buys nothing.
          autoCodeSplitting: false,
        }),
      ],
    },
  },
});
