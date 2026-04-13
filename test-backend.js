require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

console.log('Testing Supabase connection...');
console.log('URL:', process.env.SUPABASE_URL);
console.log('Key length:', process.env.SUPABASE_ANON_KEY?.length);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Database error:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    console.log('Sample data:', data);
    return true;
  } catch (error) {
    console.error('Connection failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('🎉 Backend ready for deployment!');
    process.exit(0);
  } else {
    console.log('❌ Backend needs fixing');
    process.exit(1);
  }
});