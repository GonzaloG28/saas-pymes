import path              from 'path';
import fs                from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Escanea modules/ y registra automáticamente cada módulo que exporte
 * { router, basePath } desde su routes/index.js.
 *
 * Para agregar un módulo nuevo: crear la carpeta y su routes/index.js.
 * Cero cambios en app.js.
 */
export default async function moduleLoader(app) {
  const modulesPath = path.join(__dirname, '../../modules');

  console.log('[moduleLoader] Buscando en:', modulesPath);

  const modules = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log('[moduleLoader] Módulos encontrados:', modules);

  for (const moduleName of modules) {
    const routesFile = path.join(modulesPath, moduleName, 'routes', 'index.js');

    console.log('[moduleLoader] Buscando routes en:', routesFile);

    if (!fs.existsSync(routesFile)) {         
      console.log('[moduleLoader] ⚠ No existe:', routesFile);
      continue;                                 
    }

    try {
      const { router, basePath } = await import(pathToFileURL(routesFile).href);

      if (!router || !basePath) {
        console.warn(`[moduleLoader] "${moduleName}" ignorado: falta router o basePath`);
        continue;
      }

      app.use(`/api/v1${basePath}`, router);
      console.log(`[moduleLoader] ✓ "${moduleName}" → /api/v1${basePath}`);
    } catch (err) {
      console.error(`[moduleLoader] ✗ Error en "${moduleName}":`, err.message);
      console.error(err);
    }
  }
}