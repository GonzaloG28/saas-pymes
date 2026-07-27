import { MercadoPagoConfig, Point } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export const pointClient = new Point(client);