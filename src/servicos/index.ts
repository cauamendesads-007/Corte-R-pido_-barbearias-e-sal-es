/**
 * Barrel export dos serviços.
 * Usa ServiceProvider que auto-seleciona entre Supabase (produção) e Mocks (desenvolvimento/testes)
 * baseado na variável de ambiente VITE_SUPABASE_URL
 */
export * from './ServiceProvider';
export { api } from './ServiceProvider';