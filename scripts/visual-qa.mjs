#!/usr/bin/env node
/**
 * Capture visual QA screenshots at key viewports.
 * Writes under /opt/cursor/artifacts/design-qa/
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const BASE = process.env.BASE_URL || "http://localhost:3000";
const outDir = "/opt/cursor/artifacts/design-qa";
mkdirSync(outDir, { recursive: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.PERF_TEST_EMAIL || process.env.SEED_ADMIN_EMAIL || "shankarappan@gmail.com";

function projectRef(supabaseUrl) {
  return new URL(supabaseUrl).hostname.split(".")[0];
}

async function authCookie() {
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;
  const userClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error: otpError } = await userClient.auth.verifyOtp({
    type: "email",
    token_hash: linkData.properties.hashed_token,
  });
  if (otpError || !data.session) throw otpError || new Error("no session");
  const name = `sb-${projectRef(url)}-auth-token`;
  return {
    name,
    value: JSON.stringify(data.session),
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  };
}

const viewports = [
  { name: "tablet-834x1194", width: 834, height: 1194 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "landscape-1024x768", width: 1024, height: 768 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const browser = await chromium.launch();
const cookie = await authCookie();

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  await context.addCookies([cookie]);
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: `${outDir}/login-${vp.name}.png`,
    fullPage: true,
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // ensure not redirected to login
  const path = new URL(page.url()).pathname;
  await page.screenshot({
    path: `${outDir}/home-${vp.name}.png`,
    fullPage: true,
  });
  console.log(vp.name, "home path", path, "width", await page.evaluate(() => document.body.scrollWidth));

  await page.goto(`${BASE}/songs`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: `${outDir}/songs-${vp.name}.png`,
    fullPage: true,
  });

  await context.close();
}

await browser.close();
console.log("Screenshots written to", outDir);
