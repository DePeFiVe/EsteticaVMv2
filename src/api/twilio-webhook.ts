import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Types for Twilio webhook payload
interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: 'queued' | 'failed' | 'sent' | 'delivered' | 'undelivered' | 'read';
  ErrorCode?: string;
  ErrorMessage?: string;
}

// Handler for Twilio webhook requests
export async function handleTwilioWebhook(request: Request): Promise<Response> {
  try {
    // Parse the webhook payload
    const formData = await request.formData();
    const payload: TwilioWebhookPayload = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as TwilioWebhookPayload['MessageStatus'],
      ErrorCode: formData.get('ErrorCode') as string | undefined,
      ErrorMessage: formData.get('ErrorMessage') as string | undefined
    };

    // Validate required fields
    if (!payload.MessageSid || !payload.MessageStatus) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Update the whatsapp_logs table with the new status
    const { error } = await supabase
      .from('whatsapp_logs')
      .update({
        status: payload.MessageStatus,
        error_code: payload.ErrorCode,
        error_message: payload.ErrorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('message_sid', payload.MessageSid);

    if (error) {
      console.error('Error updating whatsapp_logs:', error);
      return new Response('Error updating message status', { status: 500 });
    }

    return new Response('Status updated successfully', { status: 200 });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response('Internal server error', { status: 500 });
  }
}