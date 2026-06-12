#!/usr/bin/env node
/**
 * Write mobile/.env OAuth keys and sync backend GOOGLE_OAUTH_CLIENT_IDS hint.
 *
 * Usage:
 *   node scripts/setup-oauth.mjs --google-web=xxx.apps.googleusercontent.com
 *   node scripts/setup-oauth.mjs --google-web=... --microsoft=... --api=http://localhost:8080
 *   node scripts/setup-oauth.mjs --print-redirects
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const envPath = path.join(mobileRoot, '.env');
const scheme = 'bioby-creator';

function parseArgs(argv) {
  const out = { printRedirects: false };
  for (const arg of argv) {
    if (arg === '--print-redirects') out.printRedirects = true;
    else if (arg.startsWith('--google-web=')) out.googleWeb = arg.slice('--google-web='.length).trim();
    else if (arg.startsWith('--google-ios=')) out.googleIos = arg.slice('--google-ios='.length).trim();
    else if (arg.startsWith('--google-android=')) out.googleAndroid = arg.slice('--google-android='.length).trim();
    else if (arg.startsWith('--microsoft=')) out.microsoft = arg.slice('--microsoft='.length).trim();
    else if (arg.startsWith('--microsoft-tenant=')) out.microsoftTenant = arg.slice('--microsoft-tenant='.length).trim();
    else if (arg.startsWith('--api=')) out.api = arg.slice('--api='.length).trim();
  }
  return out;
}

function printRedirects() {
  const webPorts = ['8081', '19006'];
  console.log('\nRegister these redirect URIs in your OAuth consoles:\n');
  console.log('Google Web — Authorized JavaScript origins + redirect URIs (same URL for both):');
  for (const port of webPorts) {
    console.log(`  http://localhost:${port}`);
  }
  console.log('\nGoogle native / Microsoft login deep link:');
  console.log(`  ${scheme}://oauth/callback`);
  console.log(`  ${scheme}://oauth/microsoft/mail`);
  console.log('\nGoogle Cloud — create clients:');
  console.log('  • Web application → use Web Client ID for EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  console.log('  • iOS → EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (bundle: host.exp.Exponent for Expo Go)');
  console.log('  • Android → EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (package: host.exp.exponent for Expo Go)');
  console.log('\nMicrosoft Entra — App registration:');
  console.log('  • Platform: Mobile and desktop applications → custom redirect URIs above');
  console.log('  • Platform: Single-page application → http://localhost:8081 (if using web)');
  console.log('  • Enable public client flows if prompted');
  console.log('\nBackend (same Google Web Client ID):');
  console.log('  export GOOGLE_OAUTH_CLIENT_IDS=<your-web-client-id>');
  console.log('  or add bioby.oauth.google-client-ids in application-local.yml\n');
}

function upsertEnv(lines, key, value) {
  if (value === undefined || value === null || value === '') return lines;
  const idx = lines.findIndex((line) => line.startsWith(`${key}=`));
  const entry = `${key}=${value}`;
  if (idx >= 0) lines[idx] = entry;
  else lines.push(entry);
  return lines;
}

function loadEnvLines() {
  if (!fs.existsSync(envPath)) {
    const example = path.join(mobileRoot, '.env.example');
    if (fs.existsSync(example)) {
      return fs.readFileSync(example, 'utf8').split('\n');
    }
    return [];
  }
  return fs.readFileSync(envPath, 'utf8').split('\n');
}

function writeEnv(args) {
  let lines = loadEnvLines().filter((line, i, arr) => !(line.startsWith('#') && i === arr.length - 1 && line === ''));

  lines = upsertEnv(lines, 'EXPO_PUBLIC_API_BASE_URL', args.api ?? 'http://localhost:8080');
  lines = upsertEnv(lines, 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', args.googleWeb);
  lines = upsertEnv(lines, 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', args.googleIos);
  lines = upsertEnv(lines, 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', args.googleAndroid);
  lines = upsertEnv(lines, 'EXPO_PUBLIC_MICROSOFT_CLIENT_ID', args.microsoft);
  lines = upsertEnv(lines, 'EXPO_PUBLIC_MICROSOFT_TENANT', args.microsoftTenant ?? 'common');

  const body = lines.join('\n').replace(/\n*$/, '\n');
  fs.writeFileSync(envPath, body, 'utf8');
  console.log(`Wrote ${envPath}`);

  if (args.googleWeb) {
    const backendLocalExample = path.resolve(mobileRoot, '../backend/src/main/resources/application-local.yml.example');
    console.log('\nBackend: set Google Web Client ID + client secret (secret stays server-side only):');
    console.log(`  export GOOGLE_OAUTH_CLIENT_IDS=${args.googleWeb}`);
    console.log('  export GOOGLE_OAUTH_CLIENT_SECRET=<from Google Console JSON>');
    if (fs.existsSync(backendLocalExample)) {
      console.log('  or bioby.oauth.google-client-ids / google-client-secret in application-local.yml');
    }
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.printRedirects || (!args.googleWeb && !args.microsoft)) {
  printRedirects();
  if (!args.googleWeb && !args.microsoft) {
    console.log('No Client IDs passed. Re-run with:');
    console.log('  node scripts/setup-oauth.mjs --google-web=YOUR_ID.apps.googleusercontent.com --microsoft=YOUR_MS_CLIENT_ID');
    process.exit(0);
  }
}

writeEnv(args);
console.log('\nRestart Expo with cache clear:  npx expo start -c');
