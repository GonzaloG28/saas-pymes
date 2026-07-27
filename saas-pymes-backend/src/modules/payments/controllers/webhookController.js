import webhookService from '../services/webhookService.js';


export const mercadoPagoWebhook = async (req, res, next) => {
  try {
    const result = await webhookService.handleMercadoPagoNotification(req.body);
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    console.error('Error procesando webhook de Mercado Pago:', err.message);
    res.status(200).json({ received: true, error: err.message });
  }
};

// SOLO PARA DESARROLLO — simula un pago aprobado sin pasar por Mercado Pago real.
export const simulateApprovedPayment = async (req, res, next) => {
  try {
    const { tenantId, orderId } = req.body;
    const fakePayment = {
      id: Date.now(),
      status: 'approved',
      external_reference: `${tenantId}:${orderId}`,
      payment_method_id: 'credit_card',
      card: { last_four_digits: '4242' },
      authorization_code: 'SIMULATED',
      date_approved: new Date().toISOString(),
    };
    const result = await webhookService._processApprovedPayment({ tenantId, orderId, payment: fakePayment });
    res.json({ data: result });
  } catch (err) { next(err); }
};