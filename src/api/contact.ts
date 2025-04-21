import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method: string;
  body: any;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// Configuración del servidor de correo (mover a variables de entorno en producción)
const emailConfig = {
  host: process.env.VITE_EMAIL_HOST || 'imap.hostinger.com',
  email: process.env.VITE_EMAIL_ADDRESS || 'contacto@esteticavm.com',
  password: process.env.VITE_EMAIL_PASSWORD || 'Sanjose1172!'
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Validadores
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendEmailWithRetry(params: any, retryCount = 0): Promise<any> {
  try {
    const { error } = await supabase.functions.invoke('send-contact-email', {
      body: JSON.stringify(params)
    });

    if (error) {
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY * Math.pow(2, retryCount));
        return sendEmailWithRetry(params, retryCount + 1);
      }
      throw error;
    }

    return { error: null };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAY * Math.pow(2, retryCount));
      return sendEmailWithRetry(params, retryCount + 1);
    }
    throw error;
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { name, email, phone, message, to } = req.body;

    // Validar campos requeridos
    if (!name || !email || !phone || !message || !to) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos',
        errors: {
          name: !name ? 'El nombre es requerido' : null,
          email: !email ? 'El correo electrónico es requerido' : null,
          phone: !phone ? 'El teléfono es requerido' : null,
          message: !message ? 'El mensaje es requerido' : null
        }
      });
    }

    // Validar formato de correo electrónico
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        message: 'Formato de correo electrónico inválido',
        field: 'email'
      });
    }

    // Validar formato de teléfono
    if (!isValidPhone(phone)) {
      return res.status(400).json({ 
        message: 'Formato de teléfono inválido',
        field: 'phone'
      });
    }

    // Validar longitud del mensaje
    if (message.length < 10 || message.length > 1000) {
      return res.status(400).json({ 
        message: 'El mensaje debe tener entre 10 y 1000 caracteres',
        field: 'message'
      });
    }

    // Enviar el correo usando la función de Supabase Edge Functions con reintentos
    const { error } = await sendEmailWithRetry({
      to: emailConfig.email,
      subject: 'Nuevo mensaje de contacto - Estética VM',
      name,
      email,
      phone,
      message,
      emailConfig
    });

    if (error) {
      console.error('Error al enviar el mensaje después de reintentos:', error);
      return res.status(500).json({ 
        message: 'Error al enviar el mensaje. Por favor, inténtelo de nuevo más tarde.'
      });
    }

    return res.status(200).json({ message: 'Mensaje enviado exitosamente' });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return res.status(500).json({ 
      message: 'Error interno del servidor. Por favor, inténtelo de nuevo más tarde.'
    });
  }
}