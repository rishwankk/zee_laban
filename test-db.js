const { createClient } = require('@supabase/supabase-js');

// Using the exact credentials from your .env.local
const supabaseUrl = 'https://bxseoiiuvfikasneozbk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4c2VvaWl1dmZpa2FzbmVvemJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjA0NTAsImV4cCI6MjEwNjQzNjQ1MH0.wNSpcl2e30ZMvcihw2JcS4aavo8q5s_RHGUsHUKw5Wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing connection to Supabase...');
  const { data, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.message.includes('Could not find the table')) {
      console.error('This means the tables DO NOT exist in your Supabase project.');
    }
  } else {
    console.log('\n✅ SUCCESS! Connection working.');
    console.log('Users found in database:', data);
  }
}

testConnection();
