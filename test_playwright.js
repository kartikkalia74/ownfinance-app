import { chromium } from '@playwright/test';

async function run() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch();
  console.log("Chromium launched successfully!");
  await browser.close();
}

run().catch(console.error);
