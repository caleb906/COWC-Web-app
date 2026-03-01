#!/usr/bin/env node
/**
 * COWC Catalogue Image Uploader
 * Run from the cowc-web-app folder:  node catalogue_upload/upload.js
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

const IMAGE_MAPPING = {
  // ── Linens ────────────────────────────────────────────────────────────────
  'img-000.jpg': ['Cream Table runners'],
  'img-001.png': ['Tan/brown Runner'],
  'img-002.png': ['Brown runners'],
  'img-003.png': ['Dusty blue runners'],
  'img-010.png': ['Round tablecloth -120in Wht'],
  'img-011.png': ['Pistachio cheesecloth napkins'],
  'img-012.png': ['Cream Cheesecloth Napkins', 'cream napkins'],
  'img-015.png': ['White Runners'],
  'img-050.png': ['Dark blue cheesecloth runners'],
  'img-057.png': ['Draping cloths - cream burnt orange and rust'],
  // ── Accessories – glassware ───────────────────────────────────────────────
  'img-016.png': ['Glass Cup'],
  'img-018.png': ['Glass Cup - L'],
  'img-020.png': ['Coupe Glass'],
  'img-022.png': ['Champagne Flutes'],
  'img-024.png': ['Vintage Amber bud vases'],
  'img-026.png': ['Mixed Vintage Pressed Goblets'],
  'img-028.png': ['Stemless Wine Glass'],
  'img-030.png': ['Coupe Glass (sm)'],
  'img-034.png': ['Water Goblets'],
  'img-046.png': ['Cream plates'],
  'img-047.png': ['White dessert plates'],
  // ── Accessories – silverware ──────────────────────────────────────────────
  'img-009.png': ['Gold Fork - S', 'Gold Forks - L', 'Gold Knives', 'Gold Spoon - L', 'Gold Spoon - S'],
  'img-031.png': [
    'Dark Metallic Knives', 'Large Dark Metallic Fork', 'Large Dark Metallic Spoon',
    'Small Dark Metallic Silverware', 'Small Metallic Fork',
  ],
  // ── Lighting / candles ────────────────────────────────────────────────────
  'img-004.png': ['Battery-Powered Tapered candles'],
  'img-005.png': ['2" round candles varying heights'],
  'img-035.png': ['Gold taper candle holders- various sizes'],
  'img-036.png': ['clear Glass candle holders'],
  'img-040.png': ['18inch chimneys'],
  'img-041.png': ['Gold candle holder'],
  'img-042.png': ['Tall Glass tea light Candle holders', 'tall Glass 2in candle holder'],
  'img-044.png': ['Hurricanes'],
  'img-045.png': ['ribbed candle holders'],
  'img-065.png': ['12" chimney'],
  // ── Decor – umbrellas / baskets ───────────────────────────────────────────
  'img-006.png': ['Black Umbrella'],
  'img-007.png': ['9.5 inch white basket', '11in white basket'],
  'img-008.png': ['Clear umbrellas'],
  'img-037.png': ['paper umbrellas'],
  // ── Decor – vases / pots ──────────────────────────────────────────────────
  'img-032.png': ['assorted ribbed bud vases'],
  'img-033.png': ['clear Glass bud vases - various sizes'],
  'img-038.png': ['Clear Glass bud vases- various heights'],
  'img-058.png': ['Cement pots - 2 sizes'],
  'img-059.png': ['terracotta stone pots- 2 sizes'],
  'img-060.png': ['Aged vase'],
  'img-039.png': ['Glass Beverage Dispenser'],
  // ── Signage ───────────────────────────────────────────────────────────────
  'img-049.png': ['Gold /glass card box'],
  'img-052.png': ['Gold acrylic sign holder'],
  'img-055.png': ['wooden sign holders'],
  'img-061.png': ['Gold hanging sign Holder'],
  // ── Furniture ─────────────────────────────────────────────────────────────
  'img-051.png': ['Wooden crate'],
  'img-053.png': ['aged stone pillers'],
};

async function uploadImage(filename) {
  const filepath = path.join(IMG_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  ✗ Not found: ${filename}`);
    return null;
  }

  const ext = filename.split('.').pop().toLowerCase();
  const contentType = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';
  const data = fs.readFileSync(filepath);

  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: data,
    });

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

    if (res.status === 200 || res.status === 201) {
      console.log(`  ✓ ${filename}`);
      return publicUrl;
    } else if (res.status === 409) {
      console.log(`  ~ ${filename} (already exists)`);
      return publicUrl;
    } else {
      const text = await res.text();
      console.log(`  ✗ ${filename}: ${res.status} ${text.slice(0, 120)}`);
      return null;
    }
  } catch (err) {
    console.log(`  ✗ ${filename}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('COWC Catalogue Image Uploader');
  console.log('='.repeat(50));

  const sqlUpdates = [];
  let uploaded = 0, failed = 0;

  for (const [filename, itemNames] of Object.entries(IMAGE_MAPPING)) {
    if (!itemNames.length) continue;
    console.log(`Uploading ${filename} → ${itemNames.length} item(s)...`);
    const publicUrl = await uploadImage(filename);

    if (publicUrl) {
      uploaded++;
      for (const name of itemNames) {
        const n = name.replace(/'/g, "''");
        const u = publicUrl.replace(/'/g, "''");
        sqlUpdates.push(`UPDATE inventory_items SET photo_url = '${u}' WHERE lower(name) = lower('${n}');`);
      }
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Uploaded: ${uploaded}  |  Failed: ${failed}`);
  console.log(`SQL updates prepared: ${sqlUpdates.length}`);

  const sqlPath = path.join(__dirname, 'update_photo_urls.sql');
  fs.writeFileSync(sqlPath, sqlUpdates.join('\n') + '\n');
  console.log(`\nSQL written to: catalogue_upload/update_photo_urls.sql`);
  console.log('Send that file to Claude and it will apply it, or paste it in Supabase SQL editor.');
}

main().catch(console.error);
