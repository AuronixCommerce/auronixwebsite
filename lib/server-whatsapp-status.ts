const cleanPhone = (value: unknown) => String(value || '').replace(/[^0-9]/g, '').slice(0, 20);

export async function sendWhatsAppStatus(input: { phone: string; templateParameters: string[] }) {
  const phone = cleanPhone(input.phone);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const template = process.env.WHATSAPP_STATUS_TEMPLATE?.trim();
  const version = process.env.WHATSAPP_API_VERSION?.trim() || 'v25.0';
  if (!phone || !phoneNumberId || !accessToken || !template) return { sent: false, unavailable: true };
  const components = input.templateParameters.length ? [{ type: 'body', parameters: input.templateParameters.map(text => ({ type: 'text', text: String(text).slice(0, 1024) })) }] : undefined;
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'template', template: { name: template, language: { code: 'en_US' }, ...(components ? { components } : {}) } }),
  });
  if (!response.ok) throw new Error(`Optional status notification failed (${response.status}).`);
  return { sent: true };
}
