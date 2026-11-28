import { createClient } from '@supabase/supabase-js';

const url = 'https://ajubpuxiacvfvfgpupqn.supabase.co';
const anonKey = 'sb_publishable_PcZMoKa5-tjOqVpgGnuW4g_x39bKBj1';

const supabase = createClient(url, anonKey);

// Test 1: Try public view (should work)
console.log('=== Test 1: v_estabelecimentos_publicos ===');
const { data: publicData, error: publicError } = await supabase
  .from('v_estabelecimentos_publicos')
  .select('*')
  .eq('slug', 'barbearia-do-carlos');
console.log('Data:', publicData);
console.log('Error:', publicError);

// Test 2: Try table directly with explicit columns (should work for authorized)
console.log('\n=== Test 2: estabelecimentos table with explicit columns ===');
const { data: tableData, error: tableError } = await supabase
  .from('estabelecimentos')
  .select('id, slug, nome, responsavel, cidade, nicho, avaliacao, status, latitude, longitude, whatsapp, endereco, sobre, tema_cor, tema_layout, tema_titulo, tema_subtitulo, tempo_medio_atendimento, horario_funcionamento, permite_auto_edicao, configuracao_pix_modo, configuracao_pix_percentual_sinal, seguidores, taxa_fidelidade, data_criacao, data_atualizacao')
  .eq('slug', 'barbearia-do-carlos');
console.log('Data:', tableData);
console.log('Error:', tableError);

// Test 3: Try table with select('*') (should fail with 42501)
console.log('\n=== Test 3: estabelecimentos table with select(*) ===');
const { data: starData, error: starError } = await supabase
  .from('estabelecimentos')
  .select('*')
  .eq('slug', 'barbearia-do-carlos');
console.log('Data:', starData);
console.log('Error:', starError);

// Test 4: Test buscarEstabelecimentoPorId query (nested selects)
console.log('\n=== Test 4: Full query with nested selects ===');
const { data: fullData, error: fullError } = await supabase
  .from('estabelecimentos')
  .select('id, slug, nome, responsavel, cidade, nicho, avaliacao, status, latitude, longitude, whatsapp, endereco, sobre, tema_cor, tema_layout, tema_titulo, tema_subtitulo, tempo_medio_atendimento, horario_funcionamento, permite_auto_edicao, configuracao_pix_modo, configuracao_pix_percentual_sinal, seguidores, taxa_fidelidade, data_criacao, data_atualizacao, servicos(*, servico_midias(*)), galeria(*), avaliacoes(*)')
  .eq('id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  .single();
console.log('Data:', fullData);
console.log('Error:', fullError);
