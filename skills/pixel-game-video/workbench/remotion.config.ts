// Adapted from video-shotcraft, 2026-10-21: standalone project alias and installed Chrome only.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Config } from '@remotion/cli/config';
const hasManifest = ['workbench.ts', 'workbench.tsx'].some(f => existsSync(path.resolve('proj', f)));
Config.overrideWebpackConfig(c => ({...c, resolve: {...c.resolve, symlinks: false, alias: {...c.resolve?.alias, '@proj': path.resolve(hasManifest ? 'proj' : 'proj-stub')}}}));
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
const browser = [process.env.PIXEL_BROWSER_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(p => p && existsSync(p));
if (!browser) throw new Error('No installed Chrome found. Set PIXEL_BROWSER_EXECUTABLE. Browser auto-download is disabled by this workbench.');
Config.setBrowserExecutable(browser);
