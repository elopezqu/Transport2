// Reemplaza esto con tu token de Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2FicmllbDI5LXMiLCJhIjoiY20yMnZvYnExMDJwNzJqcTV3d3J3cmUxdSJ9.fA3z9inzGxKvS2GC_rH20g';

// Elementos de la interfaz
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');
const toggleTrackingBtn = document.getElementById('toggle-tracking');
const trackingIndicator = document.getElementById('tracking-indicator');
const trackingText = document.getElementById('tracking-text');
const latElement = document.getElementById('lat');
const lngElement = document.getElementById('lng');
const accuracyElement = document.getElementById('accuracy');
const userList = document.getElementById('user-list');
const usernameInput = document.getElementById('username');
const serverUrlInput = document.getElementById('server-url');
const serverPortInput = document.getElementById('server-port');
const roomIdInput = document.getElementById('room-id');
const mobileTabs = document.getElementById('mobile-tabs');
const tabContents = document.querySelectorAll('.tab-content');
const debugInfo = document.getElementById('debug-info');
const debugUserId = document.getElementById('debug-user-id');
const debugSocketId = document.getElementById('debug-socket-id');
const debugUsersCount = document.getElementById('debug-users-count');
const debugStatus = document.getElementById('debug-status');

// Variables para el mapa, seguimiento y sockets
let map;
let userMarker;
let otherUsersMarkers = {};
let watchId = null;
let isTracking = false;
let socket = null;
let isConnected = false;
let userId = generateUserId();
let currentRoomId = '';

// Colores para los diferentes usuarios
const userColors = [
    '#4269e1', '#e14f42', '#42e16a', '#e1d142', 
    '#9c42e1', '#e1429c', '#42e1c9', '#e18942'
];

// Inicializar el mapa
function initMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-71.5374, -16.4090],
        zoom: 13
    });
    
    // Agregar controles de navegación
    map.addControl(new mapboxgl.NavigationControl());
    
    // Cargar el mapa
    map.on('load', () => {
        console.log('Mapa cargado correctamente');
        //debugStatus.textContent = 'Mapa cargado';
        
        // Configurar funcionalidad GPX después de que el mapa esté listo
        setupGPXFunctionality();
    });
}

// Configurar funcionalidad GPX
function setupGPXFunctionality() {
    // Función para cargar GPX desde archivo local
    function loadGPXFromLocalFile() {
        const fileInput = document.getElementById('gpx-file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Por favor selecciona un archivo GPX');
            return;
        }
        
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            alert('Por favor selecciona un archivo con extensión .gpx');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const gpxText = e.target.result;
                const parser = new DOMParser();
                const gpxXml = parser.parseFromString(gpxText, 'text/xml');
                
                if (gpxXml.getElementsByTagName('parsererror').length > 0) {
                    throw new Error('Archivo GPX inválido o mal formado');
                }
                
                const geojson = toGeoJSON.gpx(gpxXml);
                addGPXToMap(geojson, file.name);
                
                document.getElementById('gpx-status').textContent = `Ruta cargada: ${file.name}`;
                document.getElementById('gpx-status').style.color = 'green';
                document.getElementById('remove-gpx-btn').disabled = false;
                
            } catch (error) {
                console.error('Error procesando el archivo GPX:', error);
                document.getElementById('gpx-status').textContent = 'Error: ' + error.message;
                document.getElementById('gpx-status').style.color = 'red';
            }
        };
        
        reader.readAsText(file);
    }

    // Función para agregar GPX al mapa
    function addGPXToMap(geojson, routeName) {
        // 1. Limpiar ruta anterior si existe
        if (map.getSource('gpx-route')) {
            map.removeLayer('gpx-route-line');
            map.removeLayer('gpx-route-points');
            map.removeSource('gpx-route');
        }
        
        // 2. Agregar la fuente GeoJSON al mapa
        map.addSource('gpx-route', {
            type: 'geojson',
            data: geojson
        });
        
        // 3. Agregar la línea de la ruta
        map.addLayer({
            id: 'gpx-route-line',
            type: 'line',
            source: 'gpx-route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#ff6b35',
                'line-width': 4,
                'line-opacity': 0.8
            },
            filter: ['==', '$type', 'LineString']
        });
        
        // 4. Agregar puntos de la ruta (opcional)
        map.addLayer({
            id: 'gpx-route-points',
            type: 'circle',
            source: 'gpx-route',
            paint: {
                'circle-radius': 5,
                'circle-color': '#ff6b35',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            },
            filter: ['==', '$type', 'Point']
        });
        
        // 5. Ajustar el mapa para mostrar toda la ruta
        const bounds = new mapboxgl.LngLatBounds();
        geojson.features.forEach(feature => {
            if (feature.geometry.type === 'LineString') {
                feature.geometry.coordinates.forEach(coord => {
                    bounds.extend(coord);
                });
            } else if (feature.geometry.type === 'Point') {
                bounds.extend(feature.geometry.coordinates);
            }
        });
        
        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, {
                padding: 50,
                duration: 2000
            });
        }
        
        console.log(`Ruta GPX "${routeName}" cargada correctamente`);
    }

    // Función para eliminar la ruta
    function removeGPXRoute() {
        if (map.getSource('gpx-route')) {
            map.removeLayer('gpx-route-line');
            map.removeLayer('gpx-route-points');
            map.removeSource('gpx-route');
            
            document.getElementById('gpx-file-input').value = '';
            document.getElementById('gpx-status').textContent = 'Ruta eliminada';
            document.getElementById('gpx-status').style.color = 'gray';
            document.getElementById('remove-gpx-btn').disabled = true;
        }
    }

    // Configurar event listeners para GPX
    const loadGpxBtn = document.getElementById('load-local-gpx');
    const removeGpxBtn = document.getElementById('remove-gpx-btn');
    const gpxFileInput = document.getElementById('gpx-file-input');
    
    if (loadGpxBtn) {
        loadGpxBtn.addEventListener('click', loadGPXFromLocalFile);
    }
    
    if (removeGpxBtn) {
        removeGpxBtn.addEventListener('click', removeGPXRoute);
    }
    
    if (gpxFileInput) {
        gpxFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                loadGPXFromLocalFile();
            }
        });
    }
    
    console.log('Módulo GPX cargado correctamente');
}

// Generar un ID único para el usuario
function generateUserId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Conectar al servidor de WebSockets
function connectToServer() {
    const username = usernameInput.value || 'UsuarioAnónimo';
    const serverUrl = serverUrlInput.value || 'misdominios.dev';
    currentRoomId = roomIdInput.value || 'default-room';
    
    // Ya no necesitamos el puerto, ya que usamos el mismo dominio
    const serverFullUrl = `https://${serverUrl}`;
    
    console.log(`Conectando a ${serverFullUrl} como ${username} (${userId}) en sala ${currentRoomId}...`);
    debugStatus.textContent = `Conectando a ${serverFullUrl}...`;
    
    // Conectar con el servidor Socket.io
    try {
        socket = io(serverFullUrl, {
            path: '/socket.io/'
        });
        
        // Configurar manejadores de eventos del socket
        socket.on('connect', () => {
            console.log('Conectado al servidor con ID:', socket.id);
            debugStatus.textContent = 'Conectado al servidor';
            debugSocketId.textContent = socket.id;
            
            isConnected = true;
            connectionIndicator.classList.remove('inactive');
            connectionIndicator.classList.add('connected');
            connectionText.textContent = 'Conectado';
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            usernameInput.disabled = true;
            serverUrlInput.disabled = true;
            roomIdInput.disabled = true;
            
            // Unirse a la sala
            socket.emit('join-room', {
                roomId: currentRoomId,
                userId: userId,
                username: username
            });
            
            // Solicitar ubicaciones existentes
            socket.emit('request-locations', currentRoomId);
        });
        
        socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            debugStatus.textContent = 'Desconectado del servidor';
            handleDisconnection();
        });
        
        socket.on('connect_error', (error) => {
            console.error('Error de conexión:', error);
            debugStatus.textContent = `Error de conexión: ${error.message}`;
            alert(`Error al conectar con el servidor: ${error.message}`);
            handleDisconnection();
        });
        
        // Recibir ubicación de otro usuario
        socket.on('user-location', (data) => {
            console.log('Ubicación recibida de otro usuario:', data);
            debugStatus.textContent = `Ubicación recibida de ${data.username}`;
            updateOtherUserPosition(data);
        });
        
        // Recibir ubicaciones existentes al conectarse
        socket.on('existing-locations', (locations) => {
            console.log('Ubicaciones existentes recibidas:', locations);
            debugStatus.textContent = `Recibidas ${locations.length} ubicaciones existentes`;
            
            // Limpiar marcadores existentes primero
            removeAllOtherUserMarkers();
            
            locations.forEach(location => {
                updateOtherUserPosition(location);
            });
            
            debugUsersCount.textContent = Object.keys(otherUsersMarkers).length;
        });
        
        // Usuario conectado
        socket.on('user-connected', (userData) => {
            console.log('Usuario conectado:', userData);
            debugStatus.textContent = `${userData.username} se ha conectado`;
            
            // Actualizar lista de usuarios
            updateUserList(userData, getColorForUserId(userData.userId), 'add');
        });
        
        // Usuario desconectado
        socket.on('user-disconnected', (userData) => {
            console.log('Usuario desconectado:', userData);
            debugStatus.textContent = `${userData.username} se ha desconectado`;
            removeOtherUserMarker(userData.userId);
            
            // Actualizar lista de usuarios
            updateUserList(userData, null, 'remove');
        });
        
        // Confirmación de unión a sala
        socket.on('room-joined', (data) => {
            console.log('Unido a la sala:', data);
            debugStatus.textContent = `Unido a la sala: ${data.roomId}`;
        });
        
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        debugStatus.textContent = `Error: ${error.message}`;
        alert('Error al conectar con el servidor. Verifica la URL.');
    }
}

// Obtener color para un ID de usuario
function getColorForUserId(userId) {
    const colorIndex = Math.abs(hashCode(userId)) % userColors.length;
    return userColors[colorIndex];
}

// Manejar la desconexión
function handleDisconnection() {
    isConnected = false;
    connectionIndicator.classList.remove('connected');
    connectionIndicator.classList.add('inactive');
    connectionText.textContent = 'Desconectado';
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    usernameInput.disabled = false;
    serverUrlInput.disabled = false;
    roomIdInput.disabled = false;
    
    // Detener seguimiento si estaba activo
    if (isTracking) {
        stopTracking();
    }
    
    // Eliminar marcadores de otros usuarios
    removeAllOtherUserMarkers();
    
    // Actualizar lista de usuarios
    userList.innerHTML = '<div class="user-item"><div class="user-info"><div class="user-color" style="background-color: #4269e1;"></div><span>Ningún usuario conectado</span></div></div>';
    
    debugStatus.textContent = 'Desconectado';
    debugSocketId.textContent = 'N/A';
    debugUsersCount.textContent = '0';
}

// Desconectar del servidor
function disconnectFromServer() {
    if (socket) {
        console.log('Desconectando del servidor...');
        debugStatus.textContent = 'Desconectando...';
        socket.disconnect();
        socket = null;
    }
    handleDisconnection();
}

// Iniciar o detener el seguimiento de ubicación
function toggleTracking() {
    if (isTracking) {
        stopTracking();
    } else {
        startTracking();
    }
}

// Iniciar el seguimiento de ubicación
function startTracking() {
    if (!navigator.geolocation) {
        alert('Geolocalización no es soportada por tu navegador');
        return;
    }
    
    // Actualizar interfaz
    isTracking = true;
    //trackingIndicator.classList.remove('inactive');
    //trackingIndicator.classList.add('tracking');
    //trackingText.textContent = 'Seguimiento activo';
    //toggleTrackingBtn.textContent = 'Detener Seguimiento';
    //debugStatus.textContent = 'Seguimiento de ubicación activo';
    
    // Opciones para la geolocalización
    const options = {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000
    };
    
    // Obtener ubicación actual
    navigator.geolocation.getCurrentPosition(
        position => updatePosition(position),
        error => handleError(error),
        options
    );
    
    // Observar cambios de ubicación
    watchId = navigator.geolocation.watchPosition(
        position => updatePosition(position),
        error => handleError(error),
        options
    );
}

// Detener el seguimiento de ubicación
function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // Actualizar interfaz
    isTracking = false;
    trackingIndicator.classList.remove('tracking');
    trackingIndicator.classList.add('inactive');
    trackingText.textContent = 'Seguimiento inactivo';
    toggleTrackingBtn.textContent = 'Iniciar Seguimiento';
    debugStatus.textContent = 'Seguimiento de ubicación detenido';
}

// Actualizar la posición en el mapa
function updatePosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    
    // Actualizar la interfaz con las coordenadas
    //latElement.textContent = latitude.toFixed(6);
    //lngElement.textContent = longitude.toFixed(6);
    //accuracyElement.textContent = accuracy.toFixed(2);
    
    // Centrar el mapa en la nueva ubicación
    if (map) {
        map.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            speed: 1.5
        });
    }
    
    // Actualizar o crear el marcador
    if (!userMarker && map) {
        // Crear un elemento personalizado para el marcador
        const el = document.createElement('div');
        el.className = 'user-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.backgroundColor = '#4269e1';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        
        userMarker = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .addTo(map);
    } else if (userMarker) {
        userMarker.setLngLat([longitude, latitude]);
    }
    
    // Enviar la ubicación al servidor si está conectado
    if (isConnected && socket) {
        const username = usernameInput.value || 'UsuarioAnónimo';
        
        const locationData = {
            userId: userId,
            username: username,
            roomId: currentRoomId,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            timestamp: new Date().toISOString()
        };
        
        socket.emit('location-update', locationData);
        debugStatus.textContent = 'Enviando ubicación...';
    }
}

// Manejar errores de geolocalización
function handleError(error) {
    console.error('Error obteniendo la ubicación:', error);
    debugStatus.textContent = `Error de geolocalización: ${error.message}`;
    
    let errorMessage;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, habilita los permisos de ubicación en tu navegador.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible.';
            break;
        case error.TIMEOUT:
            errorMessage = 'Tiempo de espera para obtener la ubicación agotado.';
            break;
        default:
            errorMessage = 'Error desconocido al obtener la ubicación.';
    }
    
    alert(errorMessage);
    stopTracking();
}

// Actualizar la ubicación de otro usuario en el mapa
function updateOtherUserPosition(userData) {
    // No actualizar nuestra propia ubicación
    if (userData.userId === userId) return;
    
    // Si ya existe un marcador para este usuario, actualizarlo
    if (otherUsersMarkers[userData.userId] && map) {
        otherUsersMarkers[userData.userId].setLngLat([userData.longitude, userData.latitude]);
        debugStatus.textContent = `Actualizando ubicación de ${userData.username}`;
    } else if (map) {
        // Crear un nuevo marcador para este usuario
        const color = getColorForUserId(userData.userId);
        
        const el = document.createElement('div');
        el.className = 'user-marker';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.backgroundColor = color;
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.3)';
        
        const marker = new mapboxgl.Marker(el)
            .setLngLat([userData.longitude, userData.latitude])
            .addTo(map);
        
        // Añadir popup con el nombre de usuario
        marker.setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<strong>${userData.username}</strong><br>Actualizado: ${new Date().toLocaleTimeString()}`));
        
        otherUsersMarkers[userData.userId] = marker;
        
        // Actualizar la lista de usuarios
        updateUserList(userData, color, 'add');
        
        debugStatus.textContent = `Nuevo usuario: ${userData.username}`;
        debugUsersCount.textContent = Object.keys(otherUsersMarkers).length;
    }
}

// Eliminar marcador de usuario desconectado
function removeOtherUserMarker(userId) {
    if (otherUsersMarkers[userId]) {
        otherUsersMarkers[userId].remove();
        delete otherUsersMarkers[userId];
        
        // Actualizar la lista de usuarios
        updateUserList({userId: userId}, null, 'remove');
        
        debugUsersCount.textContent = Object.keys(otherUsersMarkers).length;
    }
}

// Eliminar todos los marcadores de otros usuarios
function removeAllOtherUserMarkers() {
    for (const userId in otherUsersMarkers) {
        otherUsersMarkers[userId].remove();
    }
    otherUsersMarkers = {};
    debugUsersCount.textContent = '0';
}

// Actualizar la lista de usuarios conectados
function updateUserList(userData, color, action) {
    if (action === 'add') {
        // Evitar duplicados
        if (document.getElementById(`user-${userData.userId}`)) {
            return;
        }
        
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.id = `user-${userData.userId}`;
        
        userItem.innerHTML = `
            <div class="user-info">
                <div class="user-color" style="background-color: ${color};"></div>
                <span>${userData.username}</span>
            </div>
            <div class="user-status">Conectado</div>
        `;
        
        // Si es la lista vacía por defecto, reemplazarla
        if (userList.innerHTML.includes('Ningún usuario conectado')) {
            userList.innerHTML = '';
        }
        
        userList.appendChild(userItem);
    } else if (action === 'remove') {
        const userElement = document.getElementById(`user-${userData.userId}`);
        if (userElement) {
            userElement.remove();
        }
        
        // Si no hay usuarios, mostrar mensaje
        if (userList.children.length === 0) {
            userList.innerHTML = '<div class="user-item"><div class="user-info"><div class="user-color" style="background-color: #4269e1;"></div><span>Ningún usuario conectado</span></div></div>';
        }
    }
}

// Función hash para generar un índice de color consistente para cada usuario
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

// Funcionalidad para pestañas en móviles
function initMobileTabs() {
    if (mobileTabs) {
        const tabs = mobileTabs.querySelectorAll('.mobile-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                
                // Activar pestaña clickeada
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Mostrar contenido correspondiente
                tabContents.forEach(content => {
                    content.style.display = 'none';
                });
                
                document.getElementById(`${tabName}-tab`).style.display = 'block';
            });
        });
        
        // Ocultar todos los contenidos inicialmente excepto el primero
        tabContents.forEach((content, index) => {
            if (index > 0) {
                content.style.display = 'none';
            }
        });
    }
}

// Verificar si es un dispositivo móvil
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Inicializar la aplicación cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    startTracking();
    
    // Inicializar pestañas móviles si es necesario
    if (isMobileDevice()) {
        initMobileTabs();
        mobileTabs.style.display = 'flex';
    }
    
    // Ajustar el valor del servidor para usar HTTPS
    serverUrlInput.value = 'misdominios.dev';
    serverPortInput.style.display = 'none';
    
    // Configurar información de depuración
    debugUserId.textContent = userId;
    
});
