import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rymhbtdltsxcxtymbvea.supabase.co';
const supabaseKey = 'sb_publishable_UFOOkQB39bNf2TD1bYAZ_g_J3laJ-R_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Starting sync...');
  // Get all stores
  const { data: stores } = await supabase.from('stores').select('id');
  if (!stores) {
    console.log('No stores found.');
    return;
  }
  
  // Get all active products
  const { data: products } = await supabase.from('products').select('id').eq('is_active', true);
  if (!products) {
    console.log('No products found.');
    return;
  }

  // Get all existing stock entries to avoid duplicates
  const { data: existingStock } = await supabase.from('stock').select('store_id, product_id');
  const existingSet = new Set(existingStock?.map(s => `${s.store_id}-${s.product_id}`));

  const stockEntries = [];
  for (const store of stores) {
    for (const product of products) {
      if (!existingSet.has(`${store.id}-${product.id}`)) {
        stockEntries.push({
          id: `stk-${store.id}-${product.id}-${Math.floor(Math.random()*10000)}`,
          store_id: store.id,
          product_id: product.id,
          quantity: 0,
          status: "out_of_stock",
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  if (stockEntries.length > 0) {
    console.log(`Inserting ${stockEntries.length} missing stock entries...`);
    // Insert in batches if needed, but for typical counts it's fine.
    const { error } = await supabase.from('stock').insert(stockEntries);
    if (error) {
      console.error(error);
    } else {
      console.log('Done!');
    }
  } else {
    console.log('No missing stock entries found.');
  }
}

fix();
