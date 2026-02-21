#!/usr/bin/env node
/**
 * COWC Airtable → Supabase Migration Script
 *
 * Usage:
 *   node migrate-airtable-to-supabase.mjs
 *
 * Requirements:
 *   node 18+ (uses native fetch)
 *
 * What it does:
 *   1. Reads all tables in your Airtable base
 *   2. Shows you a summary of what's there
 *   3. Migrates weddings, tasks, vendors, timeline items → Supabase
 *   4. Prints a final summary
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const AIRTABLE_API_KEY  = 'pat8vAH9Pw4AYfI5t'           // your PAT
const AIRTABLE_BASE_ID  = 'appNMMOIuzG0YzyGa'            // your base
const SUPABASE_URL      = 'https://qnnnfbutcsciebimtlgy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubm5mYnV0Y3NjaWViaW10bGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjYyMzcsImV4cCI6MjA4NDEwMjIzN30.NvRSiqcFCyLKdhysmYUMFftty2ffZNZzPPMe4Wm2jcQ'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const airtable = async (path, opts = {}) => {
  const res = await fetch(`https://api.airtable.com/v0${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Airtable ${path}: ${res.status} ${err}`)
  }
  return res.json()
}

const supabase = async (path, body, method = 'POST') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase ${path}: ${res.status} ${err}`)
  }
  return res.status === 204 ? null : res.json()
}

/** Fetch ALL records from an Airtable table (handles pagination) */
const allRecords = async (tableId) => {
  const records = []
  let offset = null
  do {
    const url = `/${AIRTABLE_BASE_ID}/${tableId}?pageSize=100${offset ? `&offset=${offset}` : ''}`
    const data = await airtable(url)
    records.push(...(data.records || []))
    offset = data.offset || null
  } while (offset)
  return records
}

/** Insert rows in batches to avoid Supabase payload limits */
const batchInsert = async (table, rows, batchSize = 50) => {
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    await supabase(`/${table}`, batch)
    inserted += batch.length
    process.stdout.write(`  ↳ inserted ${inserted}/${rows.length}\r`)
  }
  console.log(`  ↳ inserted ${inserted}/${rows.length} ✓`)
  return inserted
}

// ─── CATEGORY NORMALIZER ─────────────────────────────────────────────────────
const VALID_CATEGORIES = ['florals', 'décor', 'lighting', 'linens', 'signage', 'accessories', 'furniture', 'general']

const normalizeCategory = (raw) => {
  if (!raw) return 'general'
  const lower = String(raw).toLowerCase()
  if (lower.includes('floral') || lower.includes('flower')) return 'florals'
  if (lower.includes('décor') || lower.includes('decor')) return 'décor'
  if (lower.includes('light')) return 'lighting'
  if (lower.includes('linen')) return 'linens'
  if (lower.includes('sign')) return 'signage'
  if (lower.includes('access') || lower.includes('jewelry')) return 'accessories'
  if (lower.includes('furni') || lower.includes('chair') || lower.includes('table')) return 'furniture'
  return 'general'
}

// ─── VENDOR CATEGORY NORMALIZER ──────────────────────────────────────────────
const VALID_VENDOR_CATS = ['photographer','videographer','florist','caterer','band','dj','baker','hair_makeup','planner','venue','transportation','rentals','other']

const normalizeVendorCategory = (raw) => {
  if (!raw) return 'other'
  const lower = String(raw).toLowerCase()
  if (lower.includes('photo')) return 'photographer'
  if (lower.includes('video')) return 'videographer'
  if (lower.includes('floral') || lower.includes('flower')) return 'florist'
  if (lower.includes('cater') || lower.includes('food')) return 'caterer'
  if (lower.includes('band') || lower.includes('music')) return 'band'
  if (lower.includes('dj')) return 'dj'
  if (lower.includes('bak') || lower.includes('cake')) return 'baker'
  if (lower.includes('hair') || lower.includes('makeup') || lower.includes('beauty')) return 'hair_makeup'
  if (lower.includes('plan') || lower.includes('coord')) return 'planner'
  if (lower.includes('venue') || lower.includes('location')) return 'venue'
  if (lower.includes('transport') || lower.includes('limo') || lower.includes('car')) return 'transportation'
  if (lower.includes('rental')) return 'rentals'
  return 'other'
}

// ─── STATUS NORMALIZER ───────────────────────────────────────────────────────
const normalizeStatus = (raw) => {
  if (!raw) return 'Planning'
  const lower = String(raw).toLowerCase()
  if (lower.includes('complet')) return 'Completed'
  if (lower.includes('cancel')) return 'Cancelled'
  if (lower.includes('active') || lower.includes('planning')) return 'Planning'
  if (lower.includes('sign')) return 'Signed'
  if (lower.includes('talk') || lower.includes('consult')) return 'In Talks'
  if (lower.includes('inquiry') || lower.includes('lead')) return 'Inquiry'
  return 'Planning'
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 COWC Airtable → Supabase Migration\n')
  console.log('─'.repeat(50))

  // 1. Get all tables
  console.log('\n📋 Reading Airtable base structure...')
  const { tables } = await airtable(`/meta/bases/${AIRTABLE_BASE_ID}/tables`)
  console.log(`   Found ${tables.length} tables:`)
  tables.forEach(t => console.log(`   • ${t.name} (${t.id})`))

  // Helper: find table by name fragment
  const findTable = (fragment) =>
    tables.find(t => t.name.toLowerCase().includes(fragment.toLowerCase()))

  // ── 2. WEDDINGS ─────────────────────────────────────────────────────────────
  const weddingsTable = findTable('Wedding') || findTable('Couple')
  let weddingIdMap = {} // airtableRecordId → supabase uuid

  if (weddingsTable) {
    console.log(`\n👰 Migrating Weddings from "${weddingsTable.name}"...`)
    const records = await allRecords(weddingsTable.id)
    console.log(`   ${records.length} records found`)

    const rows = records.map(r => {
      const f = r.fields
      return {
        couple_name:           f['Couple Name']       || f['Name'] || f['Couple'] || 'Unknown Couple',
        wedding_date:          f['Wedding Date']      || f['Date'] || null,
        ceremony_time:         f['Ceremony Time']     || f['Time'] || null,
        venue_name:            f['Venue Name']        || f['Venue'] || null,
        venue_address:         f['Venue Address']     || null,
        guest_count:           parseInt(f['Guest Count'] || f['Guests'] || 0) || null,
        budget:                parseFloat(f['Budget'] || 0) || null,
        status:                normalizeStatus(f['Status']),
        notes:                 f['Notes']             || null,
        theme_primary_color:   f['Theme Primary Color'] || f['Primary Color'] || '#d4a574',
        theme_secondary_color: f['Theme Secondary Color'] || f['Secondary Color'] || '#2d3748',
        theme_accent_color:    f['Theme Accent Color']  || f['Accent Color'] || '#faf9f7',
        theme_vibe:            f['Theme Vibe']         || f['Vibe'] || 'Classic Elegant',
        // Keep airtable ID in notes for reference mapping
        _airtable_id:          r.id,
      }
    })

    // Insert weddings and capture returned IDs
    const { _airtable_id: _, ...insertShape } = rows[0] || {}
    const insertRows = rows.map(({ _airtable_id, ...rest }) => rest)

    try {
      const inserted = await supabase('/weddings?select=id,couple_name', insertRows)
      // Try to map back by couple_name
      inserted.forEach((row, i) => {
        weddingIdMap[rows[i]._airtable_id] = row.id
      })
      console.log(`  ↳ inserted ${inserted.length}/${rows.length} ✓`)
    } catch (e) {
      // Fallback: insert one by one to capture IDs
      console.log('   (inserting individually for ID mapping...)')
      for (const row of rows) {
        const { _airtable_id, ...data } = row
        try {
          const [saved] = await supabase('/weddings?select=id', data)
          weddingIdMap[_airtable_id] = saved.id
          process.stdout.write(`  ↳ ${Object.keys(weddingIdMap).length}/${rows.length}\r`)
        } catch (e2) {
          console.warn(`   ⚠️  Skipped "${data.couple_name}": ${e2.message}`)
        }
      }
      console.log(`  ↳ inserted ${Object.keys(weddingIdMap).length}/${rows.length} ✓`)
    }
  } else {
    console.log('\n⚠️  No Weddings table found — skipping')
  }

  // ── 3. INVENTORY / CATALOGUE ─────────────────────────────────────────────
  const inventoryTable = findTable('Inventory') || findTable('Catalogue') || findTable('Catalog') || findTable('Items') || findTable('Rentals')

  if (inventoryTable) {
    console.log(`\n📦 Migrating Inventory from "${inventoryTable.name}"...`)
    const records = await allRecords(inventoryTable.id)
    console.log(`   ${records.length} records found`)

    const rows = records
      .filter(r => !r.fields['Archived'] && r.fields['Name'] || r.fields['Title'] || r.fields['Item'])
      .map(r => {
        const f = r.fields
        const totalQty = parseInt(f['Quantity'] || f['Qty'] || f['Total Qty'] || f['Qty Total'] || f['Stock'] || 1)
        return {
          title:          f['Name'] || f['Title'] || f['Item'] || 'Untitled',
          description:    f['Description'] || f['Notes'] || f['Details'] || null,
          category:       normalizeCategory(f['Category'] || f['Type'] || f['Section']),
          qty_total:      totalQty,
          price_per_unit: parseFloat(f['Price'] || f['Cost'] || f['Rate'] || f['Price Per Unit'] || 0) || 0,
          unit:           f['Unit'] || f['Units'] || 'item',
          notes:          f['Notes'] || f['Internal Notes'] || null,
          tags:           Array.isArray(f['Tags']) ? f['Tags'] : (f['Tags'] ? [f['Tags']] : []),
          archived:       false,
        }
      })

    await batchInsert('inventory_items', rows)
  } else {
    console.log('\n⚠️  No Inventory/Catalogue table found — skipping')
    console.log('   Looked for: Inventory, Catalogue, Catalog, Items, Rentals')
    console.log(`   Tables available: ${tables.map(t => t.name).join(', ')}`)
  }

  // ── 4. VENDORS ───────────────────────────────────────────────────────────
  const vendorsTable = findTable('Vendor')

  if (vendorsTable && Object.keys(weddingIdMap).length > 0) {
    console.log(`\n🤝 Migrating Vendors from "${vendorsTable.name}"...`)
    const records = await allRecords(vendorsTable.id)
    console.log(`   ${records.length} records found`)

    const rows = records
      .map(r => {
        const f = r.fields
        // Resolve linked wedding ID
        const linkedWeddingAirtableId = Array.isArray(f['Wedding']) ? f['Wedding'][0] : null
        const weddingId = linkedWeddingAirtableId ? weddingIdMap[linkedWeddingAirtableId] : null

        return {
          name:          f['Name'] || f['Vendor Name'] || 'Unknown',
          category:      normalizeVendorCategory(f['Category'] || f['Type']),
          wedding_id:    weddingId,
          contact_email: f['Contact Email'] || f['Email'] || null,
          phone:         f['Phone'] || f['Phone Number'] || null,
          website:       f['Website'] || f['URL'] || null,
          notes:         f['Notes'] || null,
        }
      })
      .filter(r => r.wedding_id) // Only import vendors linked to a wedding we migrated

    if (rows.length > 0) {
      await batchInsert('vendors', rows)
    } else {
      console.log('   No vendors with matched weddings found')
    }
  }

  // ── 5. TASKS ─────────────────────────────────────────────────────────────
  const tasksTable = findTable('Task')

  if (tasksTable && Object.keys(weddingIdMap).length > 0) {
    console.log(`\n✅ Migrating Tasks from "${tasksTable.name}"...`)
    const records = await allRecords(tasksTable.id)
    console.log(`   ${records.length} records found`)

    const rows = records
      .map(r => {
        const f = r.fields
        const linkedWeddingAirtableId = Array.isArray(f['Wedding']) ? f['Wedding'][0] : null
        const weddingId = linkedWeddingAirtableId ? weddingIdMap[linkedWeddingAirtableId] : null

        return {
          title:        f['Title'] || f['Task'] || f['Name'] || 'Untitled Task',
          description:  f['Description'] || f['Notes'] || null,
          wedding_id:   weddingId,
          due_date:     f['Due Date'] || f['Due'] || null,
          completed:    Boolean(f['Completed'] || f['Done'] || false),
          completed_at: f['Completed At'] || null,
          assigned_to:  f['Assigned To'] || 'coordinator',
        }
      })
      .filter(r => r.wedding_id)

    if (rows.length > 0) {
      await batchInsert('tasks', rows)
    } else {
      console.log('   No tasks with matched weddings found')
    }
  }

  // ── 6. TIMELINE ─────────────────────────────────────────────────────────
  const timelineTable = findTable('Timeline')

  if (timelineTable && Object.keys(weddingIdMap).length > 0) {
    console.log(`\n🕐 Migrating Timeline Items from "${timelineTable.name}"...`)
    const records = await allRecords(timelineTable.id)
    console.log(`   ${records.length} records found`)

    const rows = records
      .map((r, i) => {
        const f = r.fields
        const linkedWeddingAirtableId = Array.isArray(f['Wedding']) ? f['Wedding'][0] : null
        const weddingId = linkedWeddingAirtableId ? weddingIdMap[linkedWeddingAirtableId] : null

        return {
          title:       f['Title'] || f['Event'] || f['Activity'] || 'Untitled',
          wedding_id:  weddingId,
          time:        f['Time'] || f['Start Time'] || null,
          description: f['Description'] || f['Notes'] || null,
          order_index: parseInt(f['Order'] || f['Order Index'] || i),
        }
      })
      .filter(r => r.wedding_id)

    if (rows.length > 0) {
      await batchInsert('timeline_items', rows)
    } else {
      console.log('   No timeline items with matched weddings found')
    }
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log('✨ Migration complete!\n')
  console.log('Next steps:')
  console.log('  1. Open your admin dashboard and verify the data looks right')
  console.log('  2. If anything looks off, check the ⚠️  warnings above')
  console.log('  3. You can re-run this script safely — it ADDS records (no deduplication yet)')
  console.log('')
}

main().catch(e => {
  console.error('\n❌ Migration failed:', e.message)
  process.exit(1)
})
