// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuración de CORS para Express (más específica)
app.use(cors({
  origin: "https://elopezqu.github.io",
  credentials: true
}));

// Configuración de Socket.io corregida
const io = socketIo(server, {
  cors: {
    origin: "https://elopezqu.github.io",
    methods: ["GET", "POST"],
    credentials: true, // Añadido para permitir credenciales
    allowedHeaders: ["Content-Type"] // Añadido para headers personalizados
  }
});

app.use(express.static('public'));

// Almacenar ubicaciones de usuarios
const userLocations = {};

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Unirse a una sala específica
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Usuario ${socket.id} se unió a la sala ${roomId}`);
  });

  // Manejar actualización de ubicación
  socket.on('location-update', (data) => {
    // Almacenar la ubicación del usuario
    userLocations[data.userId] = data;
    
    // Transmitir a todos los demás en la misma sala
    socket.to(data.roomId).emit('user-location', data);
  });

  // Enviar ubicaciones existentes al nuevo usuario
  socket.on('request-locations', (roomId) => {
    const roomLocations = Object.values(userLocations).filter(
      location => location.roomId === roomId
    );
    socket.emit('existing-locations', roomLocations);
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    // Eliminar usuario de las ubicaciones (opcional)
    for (let userId in userLocations) {
      if (userLocations[userId].socketId === socket.id) {
        delete userLocations[userId];
        break;
      }
    }
  });
});

// Usar puerto 3000 o el proporcionado por el entorno
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { // Escuchar en todas las interfaces
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
