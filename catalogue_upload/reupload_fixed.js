#!/usr/bin/env node
/**
 * Re-uploads the 7 product cutout images that now have white backgrounds.
 * Run from cowc-web-app folder:  node catalogue_upload/reupload_fixed.js
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

// Only the 7 images that had black backgrounds and have been fixed
const FIXED_IMAGES = [
  'img-016.png', // Glass Cup
  'img-018.png', // Glass Cup - L
  'img-020.png', // Coupe Glass
  'img-022.png', // Champagne Flutes
  'img-024.png', // Vintage Amber bud vases
  'img-026.png', // Mixed Vintage Pressed Goblets
  'img-028.png', // Stemless Wine Glass
];

async function reupload(filename) {
  const filepath = path.join(IMG_DIR, filename);
  const data = fs.readFileSync(filepath);
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',   // overwrite existing
    },
    body: data,
  });

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
  if (res.status === 200 || res.status === 201) {
    console.log(`  ✓ ${filename}`);
    return publicUrl;
  } else {
    const text = await res.text();
    console.log(`  ✗ ${filename}: ${res.status} ${text.slice(0, 100)}`);
    return null;
  }
}

async function main() {
  console.log('Re-uploading fixed images (white backgrounds)...');
  // Need temp anon upload policy — Claude will re-enable it before you run this.
  for (const f of FIXED_IMAGES) {
    await reupload(f);
  }
  console.log('\nDone! The photos should now show clean white backgrounds.');
}

main().catch(console.error);
