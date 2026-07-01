import { chromium } from '@playwright/test'

/** Smokes: Playwright-Chromium, sonst System-Chrome (wenn Bundle-Download fehlt). */
export async function launchSmokeBrowser() {
  try {
    return await chromium.launch()
  } catch {
    return chromium.launch({ channel: 'chrome', headless: true })
  }
}
