const cron = require('node-cron');

const POSTGREST_URL = 'http://localhost:3001';

async function obtenerHuerfanos() {
  const url = `${POSTGREST_URL}/archivos?entidad_tipo=eq.usuario&or=(...)`; // ajusta filtro real
  const res = await fetch(url, { headers: AUTH_HEADER });
  if (!res.ok) throw new Error(`Error fetching huérfanos: ${res.status}`);
  return res.json();
}

async function borrarArchivoFisico(nombre) {
  // Tu lógica para borrar archivo local aquí
  console.log(`Borrando archivo físico: ${nombre}`);
  // ...
}

async function borrarRegistro(id) {
  const url = `${POSTGREST_URL}/archivos?id=eq.${id}`;
  const res = await fetch(url, { method: 'DELETE', headers: AUTH_HEADER });
  if (!res.ok) throw new Error(`Error borrando registro ${id}: ${res.status}`);
  console.log(`Registro borrado ID: ${id}`);
}

async function limpiarHuerfanos() {
  try {
    console.log('Inicio limpieza huérfanos...');
    const huérfanos = await obtenerHuerfanos();
    console.log(`Encontrados ${huérfanos.length} archivos huérfanos.`);

    for (const archivo of huérfanos) {
      await borrarArchivoFisico(archivo.nombre_almacenado);
      await borrarRegistro(archivo.id);
    }
    console.log('Limpieza finalizada.');
  } catch (err) {
    console.error('Error en limpieza:', err);
  }
}

// Programar cron job a las 3 AM todos los días
cron.schedule('0 3 * * *', () => {
  limpiarHuerfanos();
  // o simplemente: limpiarHuerfanos().catch(console.error);
});

console.log('Cron job programado. Esperando ejecución...');