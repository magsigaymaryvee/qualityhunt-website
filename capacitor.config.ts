import type { CapacitorConfig } from '@capacitor/cli';

// This app is a live WebView wrapper, not an offline bundle: `webDir` below
// is required by Capacitor but never actually shipped, because `server.url`
// makes the app load the real production site over the network instead —
// same public pages and the same /admin, since they're one Next.js app.
// Rebuilding the .apk isn't needed after a normal content/code change; only
// after this file, an icon, or a native (android/) change.
const config: CapacitorConfig = {
  appId: 'com.qualityhunt.app',
  appName: 'Quality Hunt',
  webDir: 'public',
  server: {
    url: 'https://qualityhunt-website.vercel.app',
    cleartext: false,
  },
};

export default config;
