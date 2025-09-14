// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuración de CORS COMPLETO para Express (acepta cualquier origen)
app.use(cors({
  origin: true, // Permite cualquier origen
  credentials: true
}));

// Configuración de Socket.io con CORS COMPLETO
const io = socketIo(server, {
  cors: {
    origin: "*", // Permite cualquier origen (sin credenciales)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  }
});

app.use(express.static('public'));

// Almacenar ubicaciones y usuarios conectados
const userLocations = {};
const connectedUsers = {}; // Para almacenar userId, username y roomId por socket.id

io.on('connection', (socket) => {
  console.log('Usuario conectado desde origen:', socket.handshake.headers.origin);
  console.log('ID de conexión:', socket.id);

  // Unirse a una sala específica con objeto
  socket.on('join-room', (data) => {
    const { roomId, userId, username } = data;
    if (!roomId || !userId || !username) {
      console.log('Datos incompletos para unirse a la sala:', data);
      return;
    }

    socket.join(roomId);
    connectedUsers[socket.id] = { userId, username, roomId };

    console.log(`Usuario ${username} (${userId}) se unió a la sala ${roomId}`);

    // Emitir evento a los demás usuarios en la sala que un nuevo usuario se conectó
    socket.to(roomId).emit('user-connected', { userId, username });

    // Confirmar al usuario que se unió a la sala
    socket.emit('room-joined', { roomId });
  });

  // Manejar actualización de ubicación
  socket.on('location-update', (data) => {
    // Almacenar la ubicación del usuario
    userLocations[data.userId] = {
      ...data,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    };

    // Transmitir a todos los demás en la misma sala
    socket.to(data.roomId).emit('user-location', data);
    //console.log(`Ubicación actualizada para usuario ${data.userId} en sala ${data.roomId}`);
  });

  // Enviar ubicaciones existentes al nuevo usuario
  socket.on('request-locations', (roomId) => {
    const roomLocations = Object.values(userLocations).filter(
      location => location.roomId === roomId
    );
    socket.emit('existing-locations', roomLocations);
    console.log(`Enviadas ${roomLocations.length} ubicaciones a usuario ${socket.id}`);
  });

  // Manejar desconexión
  socket.on('disconnect', (reason) => {
    console.log('Usuario desconectado:', socket.id, 'Razón:', reason);

    // Obtener datos del usuario desconectado
    const userData = connectedUsers[socket.id];

    if (userData) {
      const { userId, username, roomId } = userData;

      // Emitir evento a la sala que el usuario se desconectó
      socket.to(roomId).emit('user-disconnected', { userId, username });

      // Eliminar usuario de las ubicaciones
      if (userLocations[userId]) {
        console.log(`Eliminando ubicación del usuario ${userId}`);
        delete userLocations[userId];
      }

      // Eliminar de usuarios conectados
      delete connectedUsers[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`✅ Aceptando conexiones desde cualquier origen`);
});
