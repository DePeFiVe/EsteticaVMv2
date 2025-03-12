import cron from 'node-cron';
import { supabase } from '../lib/supabase';

async function processNotifications() {
  try {
    const { error } = await supabase.rpc('process_pending_notifications');
    
    if (error) {
      console.error('Error processing notifications:', error);
      return;
    }

    console.log('Notifications processed successfully');
  } catch (err) {
    console.error('Error in notification worker:', err);
  }
}

// Ejecutar cada 5 minutos
cron.schedule('*/5 * * * *', processNotifications);

// Ejecutar inmediatamente al iniciar
processNotifications();

console.log('Notification worker started');

// Mantener el proceso vivo
process.stdin.resume();