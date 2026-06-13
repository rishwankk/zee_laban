const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rymhbtdltsxcxtymbvea.supabase.co';
const supabaseAnonKey = 'sb_publishable_UFOOkQB39bNf2TD1bYAZ_g_J3laJ-R_';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Seeding system settings...');
  const { error: err1 } = await supabase.from('system_settings').upsert([
    { key: 'admin_email', value: 'admin@laban.com' },
    { key: 'admin_password', value: 'admin123' }
  ]);
  if (err1) console.error('Err1:', err1);

  console.log('Seeding admin user...');
  const { error: err2 } = await supabase.from('users').upsert([
    { id: 'usr-001', name: 'Rishwan K (Super Admin)', email: 'admin@laban.com', role: 'admin' }
  ]);
  if (err2) console.error('Err2:', err2);

  console.log('Seeding categories...');
  const { error: err3 } = await supabase.from('categories').upsert([
    { id: 'cat-001', name: 'Laban' },
    { id: 'cat-002', name: 'Drinks' },
    { id: 'cat-003', name: 'Sweets' },
    { id: 'cat-004', name: 'Add-ons' }
  ]);
  if (err3) console.error('Err3:', err3);

  console.log('Seeding complete!');
}

seed();
