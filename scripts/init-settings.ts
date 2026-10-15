// =============================================================================
// FILE: scripts/init-settings.ts
// Seeds Settings. Run: npx tsx scripts/init-settings.ts [--reset-theme]
// =============================================================================

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../lib/db';
import Setting, { DEFAULT_SETTINGS } from '../models/Setting';

// Usage:
//   npx tsx scripts/init-settings.ts               -> create settings if missing
//   npx tsx scripts/init-settings.ts --reset-theme -> also switch an existing org to the default (Sunrise) theme
const RESET_THEME = process.argv.includes('--reset-theme');

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await db();
    console.log('Connected to MongoDB.');

    const existing = await Setting.findOne({ key: 'global' });
    if (existing) {
      console.log('Settings already exist:', existing.orgName);
      if (RESET_THEME) {
        await Setting.updateOne(
          { key: 'global' },
          {
            $set: {
              themeMode: DEFAULT_SETTINGS.themeMode,
              light: DEFAULT_SETTINGS.light,
              dark: DEFAULT_SETTINGS.dark,
              font: DEFAULT_SETTINGS.font,
              radiusMd: DEFAULT_SETTINGS.radiusMd,
              radiusLg: DEFAULT_SETTINGS.radiusLg,
            },
          }
        );
        console.log('Theme reset to the default (Sunrise) preset.');
      }
      return;
    }

    const settings = await Setting.create({
      key: 'global',
      ...DEFAULT_SETTINGS,
      orgName: 'Nibras', // Set the org name to Nibras
    });

    console.log('Created default settings:', settings.orgName);
    console.log('Theme mode:', settings.themeMode);
    console.log('Light theme primary:', settings.light.primary);
    console.log('Dark theme primary:', settings.dark.primary);
  } catch (error) {
    console.error('Error initializing settings:', error);
  } finally {
    console.log('\nSettings initialization complete.');
    process.exit(0);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});