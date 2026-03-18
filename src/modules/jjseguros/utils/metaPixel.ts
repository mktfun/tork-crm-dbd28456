declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export type MetaPixelEvent = 
  | 'PageView'
  | 'ViewContent'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout';

export interface MetaPixelParams {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  [key: string]: unknown;
}

/**
 * Inicializa o Meta Pixel no documento
 * Chamado uma vez no carregamento da página
 */
export function initMetaPixel(pixelId: string): void {
  if (!pixelId || typeof window === 'undefined') return;
  
  // Evitar inicialização duplicada
  if (window.fbq) {
    console.log('Meta Pixel já inicializado');
    return;
  }

  // Snippet oficial do Meta Pixel
  const fbq = function(...args: unknown[]) {
    // @ts-ignore
    fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
  };
  
  if (!window._fbq) window._fbq = fbq;
  // @ts-ignore
  fbq.push = fbq;
  // @ts-ignore
  fbq.loaded = true;
  // @ts-ignore
  fbq.version = '2.0';
  // @ts-ignore
  fbq.queue = [];
  
  window.fbq = fbq;

  // Carregar script do Facebook
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  // Inicializar com Pixel ID
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
  
  console.log('✅ Meta Pixel inicializado:', pixelId);
}

/**
 * Dispara um evento do Meta Pixel
 * Apenas se o Pixel estiver inicializado e isQualified for true
 */
export function trackMetaEvent(
  event: MetaPixelEvent,
  params?: MetaPixelParams,
  isQualified: boolean = true
): void {
  // Não disparar se lead não for qualificado
  if (!isQualified) {
    console.log(`🚫 Meta Pixel: Evento ${event} bloqueado (lead desqualificado)`);
    return;
  }

  if (typeof window === 'undefined' || !window.fbq) {
    console.log(`⚠️ Meta Pixel não inicializado, evento ${event} ignorado`);
    return;
  }

  try {
    window.fbq('track', event, params);
    console.log(`📊 Meta Pixel: ${event}`, params);
  } catch (error) {
    console.error('Erro ao disparar evento Meta:', error);
  }
}

/**
 * Dispara evento ViewContent (início do wizard)
 */
export function trackViewContent(contentName: string, isQualified: boolean = true): void {
  trackMetaEvent('ViewContent', {
    content_name: contentName,
    content_category: 'Insurance Quote',
  }, isQualified);
}

/**
 * Dispara evento Lead (captura de contato)
 */
export function trackLead(value?: number, isQualified: boolean = true): void {
  trackMetaEvent('Lead', {
    value: value || 0,
    currency: 'BRL',
  }, isQualified);
}

/**
 * Dispara evento CompleteRegistration (cotação enviada)
 */
export function trackCompleteRegistration(
  contentName: string,
  isQualified: boolean = true
): void {
  trackMetaEvent('CompleteRegistration', {
    content_name: contentName,
    content_category: 'Insurance Quote',
    status: 'submitted',
  }, isQualified);
}
