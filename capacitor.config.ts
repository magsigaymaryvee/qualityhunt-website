import type { CapacitorConfig } from '@capacitor/cli';

// This app is a live WebView wrapper, not an offline bundle: `webDir` below
// is required by Capacitor but never actually shipped, because `server.url`
// makes the app load the real production site over the network instead.
// Opens straight to /admin — this app is for managing the site, not
// browsing it — but it's the same Next.js origin, so admin's "View site"
// link and the public pages behind it still work fine inside the app.
// Rebuilding the .apk isn't needed after a normal content/code change; only
// after this file, an icon, or a native (android/) change.
const config: CapacitorConfig = {
  appId: 'com.qualityhunt.app',
  appName: 'Quality Hunt',
  webDir: 'public',
  server: {
    url: 'https://qualityhunt-website.vercel.app/admin',
    cleartext: false,
  },
};

export default config;
