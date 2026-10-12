import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../lib/db';
import Setting, { DEFAULT_SETTINGS } from '../models/Setting';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await db();
    console.log('Connected to MongoDB.');

    // Check if settings already exist
    const existing = await Setting.findOne({ key: 'global' });
    if (existing) {
      console.log('Settings already exist:', existing.orgName);
      return;
    }

    // Create default settings
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