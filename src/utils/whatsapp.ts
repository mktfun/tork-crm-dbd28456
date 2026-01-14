
export function generateWhatsAppUrl(phone: string, message?: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${formattedPhone}${message ? `?text=${encodedMessage}` : ''}`;
}

export function generateRenewalMessage(clientName: string, policyType: string, expirationDate: string): string {
  const firstName = clientName.split(' ')[0];
  return `Olá ${firstName}! Tudo bem? Sou da corretora. Vi aqui que o seu seguro de ${policyType} está com vencimento próximo (${formatDate(expirationDate)}). Gostaria de verificar as melhores condições para a sua renovação. Podemos conversar?`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}
