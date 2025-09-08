// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
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
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
