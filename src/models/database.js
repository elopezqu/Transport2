const { Pool } = require('pg');
require('dotenv').config();

// Configuración específica para Supabase
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  
  // CONFIGURACIÓN CRÍTICA PARA SUPABASE:
  ssl: {
    rejectUnauthorized: false // Supabase requiere SSL
  },
  
  // Configuraciones adicionales importantes
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20, // Límite de conexiones
  
  // Parámetros específicos para Supabase
  statement_timeout: 60000,
  query_timeout: 60000,
});

// Manejo mejorado de errores
pool.on('connect', (client) => {
  console.log('🔌 Nueva conexión establecida con Supabase');
});

pool.on('error', (err, client) => {
  console.error('❌ Error en el pool de conexiones:', err.message);
  
  // No salir del proceso en desarrollo
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
});

// Función de prueba de conexión mejorada
const testSupabaseConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Conectado a Supabase PostgreSQL');
    
    // Consulta simple para verificar conexión
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Hora del servidor:', result.rows[0].current_time);
    
    // Verificar tablas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('✅ Tablas disponibles:', tables.rows.map(row => row.table_name));
    
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Supabase:');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    
    if (error.code === '28P01') {
      console.log('💡 Solución: Verifica tu usuario y contraseña de Supabase');
    } else if (error.code === '3D000') {
      console.log('💡 Solución: Verifica el nombre de la base de datos');
    } else if (error.message.includes('SSL')) {
      console.log('💡 Solución: Asegúrate de tener SSL habilitado');
    }
    
    return false;
  } finally {
    if (client) client.release();
  }
};

// Probar conexión al iniciar
testSupabaseConnection().then(success => {
  if (success) {
    console.log('🎉 Configuración de Supabase correcta!');
  } else {
    console.log('⚠️  Revisa la configuración de Supabase');
  }
});

module.exports = pool;
