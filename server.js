const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Importaciones de rutas
const authRoutes = require('./src/routes/authRoutes');
const institutionRoutes = require("./src/routes/institutionRoutes");
const routeRoutes = require("./src/routes/routeRoutes");
const userRoutes = require('./src/routes/userRoutes');
//const locationRoutes = require('./src/routes/locationRoutes');

// Importación del manejador de sockets
const socketHandler = require('./src/sockets/socketHandler');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/institution',institutionRoutes);
app.use('/api/route',routeRoutes);
app.use('/api/user', userRoutes);
//app.use('/api/locations', locationRoutes);

// Configuración de Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  }
});

// Inicializar manejador de sockets
socketHandler(io);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`✅ Aceptando conexiones desde cualquier origen`);
});