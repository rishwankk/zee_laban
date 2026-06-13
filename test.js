const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rymhbtdltsxcxtymbvea.supabase.co';
const supabaseAnonKey = 'sb_publishable_UFOOkQB39bNf2TD1bYAZ_g_J3laJ-R_';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: emailData, error: err1 } = await supabase.from('system_settings').select('*').eq('key', 'admin_email');
  console.log('admin_email:', emailData, err1);
  
  const { data: pwData, error: err2 } = await supabase.from('system_settings').select('*').eq('key', 'admin_password');
  console.log('admin_password:', pwData, err2);
  
  const { data: users } = await supabase.from('users').select('*');
  console.log('users:', users);
}

test();
