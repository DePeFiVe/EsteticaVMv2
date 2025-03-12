import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';

// Obtener las variables de entorno
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');

const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return [key.trim(), valueParts.join('=').trim()];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testBlockedTimes() {
  try {
    // 1. Limpiar bloques existentes
    await supabase
      .from('blocked_times')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Crear un bloque de prueba
    const testDate = new Date();
    testDate.setHours(14, 0, 0, 0); // 2:00 PM
    const endDate = new Date(testDate);
    endDate.setHours(16, 0, 0, 0); // 4:00 PM

    console.log('\nCreando bloque de prueba:');
    console.log(`Inicio: ${format(testDate, 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`Fin: ${format(endDate, 'yyyy-MM-dd HH:mm:ss')}`);

    const { data: block, error: blockError } = await supabase
      .from('blocked_times')
      .insert({
        start_time: testDate.toISOString(),
        end_time: endDate.toISOString(),
        reason: 'Prueba de bloqueo'
      })
      .select()
      .single();

    if (blockError) throw blockError;

    // 3. Verificar el bloque creado
    const { data: verifyBlock, error: verifyError } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('id', block.id)
      .single();

    if (verifyError) throw verifyError;

    console.log('\nBloque verificado en la base de datos:');
    console.log(`ID: ${verifyBlock.id}`);
    console.log(`Inicio: ${new Date(verifyBlock.start_time).toLocaleString()}`);
    console.log(`Fin: ${new Date(verifyBlock.end_time).toLocaleString()}`);
    console.log(`Razón: ${verifyBlock.reason}`);

    // 4. Consultar bloques para el día actual
    const dayStart = new Date(testDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(testDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: dayBlocks, error: dayError } = await supabase
      .from('blocked_times')
      .select('*')
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString());

    if (dayError) throw dayError;

    console.log('\nBloques encontrados para el día:');
    dayBlocks?.forEach(block => {
      console.log(`\nID: ${block.id}`);
      console.log(`Inicio: ${new Date(block.start_time).toLocaleString()}`);
      console.log(`Fin: ${new Date(block.end_time).toLocaleString()}`);
      console.log(`Razón: ${block.reason}`);
    });

  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

testBlockedTimes();