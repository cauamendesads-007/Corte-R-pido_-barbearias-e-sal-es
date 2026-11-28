import { createClient } from '@supabase/supabase-js';

const url = 'https://ajubpuxiacvfvfgpupqn.supabase.co';
const anonKey = 'sb_publishable_PcZMoKa5-tjOqVpgGnuW4g_x39bKBj1';

const supabase = createClient(url, anonKey);

// Test calling the RLS helper functions directly
console.log('=== Test: Call is_estabelecimento_owner function ===');
const { data: fnData, error: fnError } = await supabase.rpc('is_estabelecimento_owner', {
  est_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
});
console.log('Data:', fnData);
console.log('Error:', fnError);

console.log('\n=== Test: Call is_admin function ===');
const { data: adminData, error: adminError } = await supabase.rpc('is_admin');
console.log('Data:', adminData);
console.log('Error:', adminError);

console.log('\n=== Test: Direct query on estabelecimentos with status filter ===');
const { data: directData, error: directError } = await supabase
  .from('estabelecimentos')
  .select('id, slug, nome, status')
  .eq('status', 'aprovado');
console.log('Data:', directData);
console.log('Error:', directError);
