import mongoose from 'mongoose';

const MONGO_OPTIONS = {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
};

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definida en las variables de entorno');

  try {
    await mongoose.connect(uri, MONGO_OPTIONS);
    console.log('[database] ✓ Conectado a MongoDB');
  } catch (err) {
    console.error('[database] ✗ Error conectando:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () =>
    console.warn('[database] ⚠ Conexión perdida')
  );
}
