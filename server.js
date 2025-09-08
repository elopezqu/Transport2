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

// Alternativa para Socket.io si necesitas credenciales desde cualquier origen:
// const io = socketIo(server, {
//   cors: {
//     origin: function(origin, callback) {
//       // Permite cualquier origen (útil para desarrollo)
//       return callback(null, true);
//     },
//     credentials: true,
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type"]
//   }
// });

app.use(express.static('public'));

// Almacenar ubicaciones de usuarios
const userLocations = {};

io.on('connection', (socket) => {
  console.log('Usuario conectado desde origen:', socket.handshake.headers.origin);
  console.log('ID de conexión:', socket.id);

  // Unirse a una sala específica
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Usuario ${socket.id} se unió a la sala ${roomId}`);
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
    console.log(`Ubicación actualizada para usuario ${data.userId} en sala ${data.roomId}`);
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
    
    // Eliminar usuario de las ubicaciones
    for (let userId in userLocations) {
      if (userLocations[userId].socketId === socket.id) {
        console.log(`Eliminando ubicación del usuario ${userId}`);
        delete userLocations[userId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`✅ Aceptando conexiones desde cualquier origen`);
});
