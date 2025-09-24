const { SOCKET_EVENTS, MESSAGES } = require('../config/constants');

// Almacenamiento en memoria (podrías mover esto a un modelo)
const userLocations = {};
const connectedUsers = {};

class SocketHandler {
    constructor(io) {
        this.io = io;
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log('Usuario conectado desde origen:', socket.handshake.headers.origin);
            console.log('ID de conexión:', socket.id);

            // Unirse a una sala específica
            socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => this.handleJoinRoom(socket, data));
            
            // Manejar actualización de ubicación
            socket.on(SOCKET_EVENTS.LOCATION_UPDATE, (data) => this.handleLocationUpdate(socket, data));
            
            // Solicitar ubicaciones existentes
            socket.on(SOCKET_EVENTS.REQUEST_LOCATIONS, (roomId) => this.handleRequestLocations(socket, roomId));
            
            // Manejar desconexión
            socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
        });
    }

    handleJoinRoom(socket, data) {
        const { roomId, userId, username } = data;
        
        if (!roomId || !userId || !username) {
            console.log(MESSAGES.INVALID_DATA, data);
            return;
        }

        socket.join(roomId);
        connectedUsers[socket.id] = { userId, username, roomId };

        console.log(`${MESSAGES.USER_JOINED} ${username} (${userId}) se unió a la sala ${roomId}`);

        // Notificar a otros usuarios
        socket.to(roomId).emit(SOCKET_EVENTS.USER_CONNECTED, { userId, username });
        
        // Confirmar al usuario
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, { roomId });
    }

    handleLocationUpdate(socket, data) {
        // Almacenar ubicación
        userLocations[data.userId] = {
            ...data,
            socketId: socket.id,
            timestamp: new Date().toISOString()
        };

        // Transmitir a otros en la sala
        socket.to(data.roomId).emit(SOCKET_EVENTS.USER_LOCATION, data);
        
        console.log(`${MESSAGES.LOCATION_UPDATED} para usuario ${data.userId} en sala ${data.roomId}`);
    }

    handleRequestLocations(socket, roomId) {
        const roomLocations = Object.values(userLocations).filter(
            location => location.roomId === roomId
        );
        
        socket.emit(SOCKET_EVENTS.EXISTING_LOCATIONS, roomLocations);
        console.log(`Enviadas ${roomLocations.length} ubicaciones a usuario ${socket.id}`);
    }

    handleDisconnect(socket, reason) {
        console.log('Usuario desconectado:', socket.id, 'Razón:', reason);

        const userData = connectedUsers[socket.id];

        if (userData) {
            const { userId, username, roomId } = userData;

            // Notificar desconexión
            socket.to(roomId).emit(SOCKET_EVENTS.USER_DISCONNECTED, { userId, username });

            // Limpiar datos
            if (userLocations[userId]) {
                console.log(`Eliminando ubicación del usuario ${userId}`);
                delete userLocations[userId];
            }

            delete connectedUsers[socket.id];
        }
    }
}

module.exports = (io) => {
    return new SocketHandler(io);
};