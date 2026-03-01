#!/usr/bin/env node
/**
 * Upload the 7 fixed glassware images with white backgrounds (-v2 versions)
 * Run from cowc-web-app folder:  node catalogue_upload/upload_fixed_white_bg.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://qnnnfbutcsciebimtlgy.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubm5mYnV0Y3NjaWViaW10bGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjYyMzcsImV4cCI6MjA4NDEwMjIzN30.NvRSiqcFCyLKdhysmYUMFftty2ffZNZzPPMe4Wm2jcQ';
const BUCKET = 'inventory-photos';
const IMG_DIR = path.join(__dirname, 'images');

const FILES = [
  'img-016-v2.png', // Glass Cup
  'img-018-v2.png', // Glass Cup - L
  'img-020-v2.png', // Coupe Glass
  'img-022-v2.png', // Champagne Flutes
  'img-024-v2.png', // Vintage Amber bud vases
  'img-026-v2.png', // Mixed Vintage Pressed Goblets
  'img-028-v2.png', // Stemless Wine Glass
];

async function upload(filename) {
  const filepath = path.join(IMG_DIR, filename);
  const data = fs.readFileSync(filepath);
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'image/png',
    },
    body: data,
  });

  if (res.status === 200 || res.status === 201) {
    console.log(`  ✓ ${filename}`);
    return true;
  } else {
    const text = await res.text();
    console.log(`  ✗ ${filename}: ${res.status} ${text.slice(0, 100)}`);
    return false;
  }
}

async function main() {
  console.log('Uploading 7 fixed images (white backgrounds)...');
  let success = 0;
  for (const f of FILES) {
    const ok = await upload(f);
    if (ok) success++;
  }
  console.log(`\nDone: ${success}/${FILES.length} uploaded`);
}

main().catch(console.error);
