//const { head } = require("../../src/routes/authRoutes");
// Reemplaza esto con tu token de Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2FicmllbDI5LXMiLCJhIjoiY20yMnZvYnExMDJwNzJqcTV3d3J3cmUxdSJ9.fA3z9inzGxKvS2GC_rH20g';


// Id usuario
let id = '';

// Elementos de la interfaz
const mobileTabs = document.getElementById('mobile-tabs');
const tabContents = document.querySelectorAll('.tab-content');
const userList = document.getElementById('user-list');

//Titulo institucion
const titleInstitution = document.getElementById("titleInstitution");

//URL_API
const urlBase = "https://misdominios.dev";

// Función para guardar métricas de rendimiento en base de datos
async function savePerformanceMetrics(metricsData) {
    try {
        const response = await fetch(`${urlBase}/api/performance/metrics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metricsData)
        });
        
        if (response.ok) {
            console.log('[DB] Métricas guardadas exitosamente');
        } else {
            console.error('[DB] Error al guardar métricas:', await response.text());
        }
    } catch (error) {
        console.error('[DB] Error al guardar métricas:', error);
    }
}

//Institucion actual
let institution = '';

// Variables para el mapa, seguimiento y sockets
let map;
let userMarker;
let otherUsersMarkers = {};
let watchId = null;
// ubicacion disponible
let isTracking = false;
//Ruta cargada
let inRoute = false;

//Sockets
let socket = null;
let isConnected = false;
let userId = generateUserId();
let currentRoomId = '';
let nombre = '';

// Colores para los diferentes usuarios
const userColors = '#5658c2ff';

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
        
        // Configurar funcionalidad GPX después de que el mapa esté listo
        setupGPXFunctionality();
    });
}

// Función para agregar GPX al mapa
function setupGPXFunctionality() {

    async function addGPXToMap() {
        // 1. Limpiar ruta anterior si existe
        removeGPXRoute();
            
        // 2. Cual mapa
        const select = document.getElementById('gpxSelect');

        console.log(`Valor "${select.value}" GPX`);

        //Api
        const response = await fetch(`${urlBase}/api/route/routeid`,{
            method : "POST",
            headers : {
                "Content-Type": "application/json",
            },
            body : JSON.stringify({id: select.value}) 
        });
        const data = await response.json();
        console.log(data.route);

        urlGPX = data.route.url;


        try{
            //1. Descargar el GPx
            const response = await fetch(urlGPX);
            if(!response){
                throw new Error(`Error al descargar GPX: ${response.status}`);
            }
            const gpxText = await response.text();

            //2. Parsea el texto a DOM 
            const parser = new DOMParser();
            const gpxDom = parser.parseFromString(gpxText, "text/xml");

            //3. Verifica que la librería esté disponible
            if (typeof toGeoJSON === 'undefined') {
                throw new Error('La librería toGeoJSON no está cargada');
            }

            //4. Convertir GPX a GeoJSON - usa SOLO toGeoJSON
            const geojson = toGeoJSON.gpx(gpxDom);

            // Hay datos válidos ?
            if (!geojson || !geojson.features || geojson.features.length === 0) {
                throw new Error('No se encontraron datos en el GPX');
            }

            // 5. Agrega la fuente GeoJSON al mapa
            map.addSource('gpx-route', {
                type: 'geojson',
                data: geojson
            });

            // 6. Agrega una capa para las líneas (tracks/rutas)
            map.addLayer({
                id: 'gpx-lines',
                type: 'line',
                source: 'gpx-route',
                filter: ['==', ['geometry-type'], 'LineString'],  // Solo líneas
                paint: {
                    'line-color': 'black',  //Gris oscuro
                    'line-width': 4,          // Grosor
                    'line-opacity': 0.8
                }
            });
            inRoute = true;
            
            if(isTracking && inRoute){
                const startBtn = document.getElementById('start');
                startBtn.disabled = false;
                
                //Nombre de sala completo
                currentRoomId = `${institution}-${select.options[select.selectedIndex].text}`;
                console.log(`Sala actual: ${currentRoomId}`);   
                    
            }
            console.log(`Ruta GPX cargada correctamente`);
            document.getElementById('load-gpx').disabled = true;

        } catch (error) {
            console.error('Error al cargar el GPX:', error);
            // Opcional: Muestra un mensaje en el mapa
            alert("No se puedo cargar ruta");
        }
    }
    
    // Función para eliminar la ruta
    function removeGPXRoute() {
            try {
            // 1. Remover la capa primero (si existe)
            if (map.getLayer('gpx-lines')) {
                map.removeLayer('gpx-lines');
            }

            // 2. Remover la fuente (si existe)
            if (map.getSource('gpx-route')) {
                map.removeSource('gpx-route');
            }

            // 3. Remover popups si los hay
            const popups = document.getElementsByClassName('mapboxgl-popup');
            if (popups.length) {
                popups[0].remove();
            }

            console.log('GPX removido correctamente');
            
        } catch (error) {
            console.error('Error al remover GPX:', error);
        }
    }

    // Configurar event listeners para GPX
    const loadGpxBtn = document.getElementById('load-gpx');
    loadGpxBtn.addEventListener('click', addGPXToMap);
    
    // Habilitar el botón cuando se seleccione una ruta
    document.getElementById('gpxSelect').addEventListener('change', function() {
        document.getElementById('load-gpx').disabled = false
    });

}

// Generar un ID único para el usuario
function generateUserId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Conectar al servidor de WebSockets
function connectToServer() {
    
    //Configuraciones boton start
    const startBtn = document.getElementById('start');
    startBtn.textContent = "Finalizar el viaje";
    startBtn.style.backgroundColor = "#e14f42";
    

    // Url Base
    const serverFullUrl = `${urlBase}`;
    
    console.log(`Conectando a ${serverFullUrl} como ${nombre} (${userId}) en sala ${currentRoomId}...`);
    
    // Conectar con el servidor Socket.io
    try {
        socket = io(serverFullUrl, {
            path: '/socket.io/'
        });
        
        // Configurar manejadores de eventos del socket
        socket.on('connect', () => { 
            console.log('Conectado al servidor con ID:', socket.id);

            
            isConnected = true;
            
            // Unirse a la sala
            socket.emit('join-room', {
                roomId: currentRoomId,
                userId: userId,
                username: nombre,
                userRol: 'conductor'
            });
            
            // Solicitar ubicaciones existentes
            socket.emit('request-locations', currentRoomId, 'conductor');
        });
        
        socket.on('disconnect', () => {
            console.log('Socket desconectado del servidor');
 
        });
        
        socket.on('connect_error', (error) => {
            console.error('Error de conexión:', error);
            //debugStatus.textContent = `Error de conexión: ${error.message}`;
            alert(`Error al conectar con el servidor: ${error.message}`);

        });
        
        // Recibir ubicación de otro usuario
        socket.on('user-location', (data) => {
            const receiveTime = Date.now();
            const networkLatency = data.sendTime ? receiveTime - data.sendTime : null;
            
            console.log('Ubicación recibida de otro usuario:', data);
            if (networkLatency !== null) {
                console.log(`[LATENCIA RED] ${networkLatency}ms desde ${data.username}`);
                data.networkLatency = networkLatency; // Agregar al objeto para mostrarlo en el popup
                
                // Guardar métricas en base de datos
                console.log("antes de guardar :", data.accuracy);
                savePerformanceMetrics({
                    userId: id,
                    latencia: data.accuracy.toFixed(2),
                    precision: networkLatency
                });
            }
            
            updateOtherUserPosition(data);
        });
        
        // Recibir ubicaciones existentes al conectarse
        socket.on('existing-locations', (locations) => {
            console.log('Ubicaciones existentes recibidas:', locations);
            // Limpiar marcadores existentes primero
            removeAllOtherUserMarkers();
            
            locations.forEach(location => {
                updateOtherUserPosition(location);
            });
            
        });
        
        // Usuario conectado
        socket.on('user-connected', (userData) => {
            console.log('Usuario conectado:', userData);
            
            // Actualizar lista de usuarios
            updateUserList(userData, userColors, 'add');
        });
        
        // Usuario desconectado
        socket.on('user-disconnected', (userData) => {
            console.log('Usuario desconectado:', userData);

            removeOtherUserMarker(userData.userId);
            
            // Actualizar lista de usuarios
            updateUserList(userData, null, 'remove');
        });
        
        // Confirmación de unión a sala
        socket.on('room-joined', (data) => {
            console.log('Unido a la sala:', data);
        });
        
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        alert('Error al conectar con el servidor. Verifica la URL.');
    }
}

// Manejar la desconexión
function handleDisconnection() {
    isConnected = false;
    
    // Detener seguimiento si estaba activo
    if (isTracking) {
        //stopTracking();
    }
    
    // Eliminar marcadores de otros usuarios
    removeAllOtherUserMarkers();
    
    // Actualizar lista de usuarios
    userList.innerHTML = '<div class="user-item"><div class="user-info"><div class="user-color" style="background-color: #4269e1;"></div><span>Ningún usuario conectado</span></div></div>';
    
}

// Desconectar del servidor
function disconnectFromServer() {
    
    //Configuraciones boton start
    const startBtn = document.getElementById('start');
    startBtn.textContent = "Iniciar el viaje";
    startBtn.style.backgroundColor = "#4caf50";

    if (socket) {
        socket.disconnect();
        socket = null;
    }
    handleDisconnection();
}

// Iniciar o detener el seguimiento de ubicación
function toggleTracking() {
    if (isTracking) {
        //stopTracking();
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
    
    isTracking = true;
  
    
    // Opciones para la geolocalización
    const options = {
        enableHighAccuracy: true, // ya lo usas: importante
        maximumAge: 0,            // no usar caché (devuelve la posición más reciente real)
        timeout: 60000            // más tolerancia para obtener una lectura GPS precisa
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
}

// Actualizar la posición en el mapa
function updatePosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    console.log('pos', latitude, longitude, 'acc (m):', accuracy);
    
    
    // Centrar el mapa en la nueva ubicación
    if (map) {
        map.flyTo({
            center: [longitude, latitude],
            //zoom: 17,
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
        el.style.backgroundColor = '#dd5823ff';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        
        userMarker = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .addTo(map);
        
        userMarker.setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<strong>Precisión</strong><br>${accuracy.toFixed(1)} m`));
        
    } else if (userMarker) {
        userMarker.setLngLat([longitude, latitude]);
        
        // actualizar color si cambiaste la constante selfColor
        const el = userMarker.getElement();
        if (el) {
            el.style.backgroundColor = '#dd5823ff';
        }
        
        // Actualizar popup con la última precisión reportada
        if (userMarker.getPopup()) {
            userMarker.getPopup().setHTML(`<strong>Precisión</strong><br>${accuracy.toFixed(1)} m`);
        }
    }
    
    // Enviar la ubicación al servidor si está conectado
    if (isConnected && socket) {
        //const username = 'UsuarioAnónimo';
        
        const locationData = {
            userId: userId,
            username: nombre,
            roomId: currentRoomId,
            userRol: 'conductor',
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            sendTime: Date.now(), // Timestamp en milisegundos para calcular latencia
            timestamp: new Date().toISOString()
        };
        
        socket.emit('location-update', locationData);
    }
}

// Manejar errores de geolocalización
function handleError(error) {
    console.error('Error obteniendo la ubicación:', error);    
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
    //stopTracking();
}

// Actualizar la ubicación de otro usuario en el mapa
function updateOtherUserPosition(userData) {
    // No actualizar nuestra propia ubicación
    if (userData.userId === userId) return;
    
    // Construir HTML del popup con latencia si está disponible
    let popupHTML = `<strong>${userData.username}</strong>`;
    if (userData.networkLatency !== undefined) {
        popupHTML += `<br><strong>Latencia de red:</strong> ${userData.networkLatency}ms`;
    }
    if (userData.accuracy !== undefined) {
        popupHTML += `<br><strong>Precisión:</strong> ${userData.accuracy.toFixed(1)}m`;
    }
    popupHTML += `<br>Actualizado: ${new Date().toLocaleTimeString()}`;
    
    // Si ya existe un marcador para este usuario, actualizarlo
    if (otherUsersMarkers[userData.userId] && map) {
        otherUsersMarkers[userData.userId].setLngLat([userData.longitude, userData.latitude]);
        
        // Actualizar el popup con la nueva información
        if (otherUsersMarkers[userData.userId].getPopup()) {
            otherUsersMarkers[userData.userId].getPopup().setHTML(popupHTML);
        }
        //debugStatus.textContent = `Actualizando ubicación de ${userData.username}`;
    } else if (map) {
        // Crear un nuevo marcador para este usuario
        const el = document.createElement('div');
        el.className = 'user-marker';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.backgroundColor = userColors;
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.3)';
        
        const marker = new mapboxgl.Marker(el)
            .setLngLat([userData.longitude, userData.latitude])
            .addTo(map);
        
        // Añadir popup con el nombre de usuario y latencia
        marker.setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(popupHTML));
        
        otherUsersMarkers[userData.userId] = marker;
        
        // Actualizar la lista de usuarios
        updateUserList(userData, userColors, 'add');
        
    }
}

// Eliminar marcador de usuario desconectado
function removeOtherUserMarker(userId) {
    if (otherUsersMarkers[userId]) {
        otherUsersMarkers[userId].remove();
        delete otherUsersMarkers[userId];
        
        // Actualizar la lista de usuarios
        updateUserList({userId: userId}, null, 'remove');
    }
}

// Eliminar todos los marcadores de otros usuarios
function removeAllOtherUserMarkers() {
    for (const userId in otherUsersMarkers) {
        otherUsersMarkers[userId].remove();
    }
    otherUsersMarkers = {};
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


// Verificar si es un dispositivo móvil
function isMobileDevice() {
    return window.innerWidth <= 768;
}

//Funcion para cargar rutas
async function getRoutes(id) {
    
    //Api
    const response = await fetch(`${urlBase}/api/route/institution`,{
            method : "POST",
            headers : {
                "Content-Type": "application/json",
            },
            body : JSON.stringify({idInstitution: id}) 
        });
    const data = await response.json();
    console.log(data.route);
    
    
    //Selet
    const select = document.getElementById('gpxSelect');
    // Llenar con datos de la API
    data.route.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = `${route.nombre}`;
        select.appendChild(option);
    });
    
}

//Funcion para datos de Usuario
async function getNombreUsuario(id){
    try{
        const response = await fetch(`${urlBase}/api/user/id`,{
            method : "POST",
            headers : {
                "Content-Type": "application/json",
            },
            body : JSON.stringify({idUser: id}) 
        });
        const data = await response.json();
        //Nombre usuario
        nombre = data.user.name;
        console.log("Nombre usuario :", nombre);


    } catch (error){
        alert('Error de conexión (Usuario)');
    }
}

//Funcion para datos de Institucion
async function getInstitution(id){
    try{
    
        const response = await fetch(`${urlBase}/api/institution/user`,{
            method : "POST",
            headers : {
                "Content-Type": "application/json",
            },
            body : JSON.stringify({idUser: id}) 
        });
        const data = await response.json();
        //Nombre institucion
        titleInstitution.textContent = data.institution.name;
        institution = data.institution.name;
        //Cargar rutas
        getRoutes(data.institution.id);

    } catch (error){
        alert('Error de conexión con el servidor script');
    }
}



// VERIFICAR AUTENTICACIÓN AL CARGAR LA PÁGINA
window.onload = function() {
    if (!verificarAutenticacion()) {
        window.location.href = `${urlBase}`;
        return;
    }
    
};

// Función para verificar si está logueado
function verificarAutenticacion() {
    const logueado = getCookie('usuarioLogueado');
    return logueado === 'true';
}

// Función para obtener cookies
function getCookie(nombre) {
    const nombreEQ = nombre + "=";
    const cookies = document.cookie.split(';');
    
    for(let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nombreEQ) === 0) {
            return cookie.substring(nombreEQ.length, cookie.length);
        }
    }
    return null;
}

// Función para cerrar sesión


function cerrarSesion() {
    // Eliminar cookies estableciendo fecha pasada
    document.cookie = "usuarioLogueado=false; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = `${urlBase}`;
}


// Inicializar la aplicación cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    
    initMap();
    startTracking();
    

    //Parametro
    const urlParams = new URLSearchParams(window.location.search);
    id = urlParams.get('id');
    console.log("parametro :", id);

    //Institucion
    getInstitution(id);

    getNombreUsuario(id);
    
    //Inicio
    document.getElementById('start').disabled = true;

    //Cerrar sesion
    const logoutBtnEl = document.getElementById('logoutBtn');
    logoutBtnEl.addEventListener('click', cerrarSesion);
    

    // Inicializar pestañas móviles si es necesario
    if (isMobileDevice()) {
        initMobileTabs();
        mobileTabs.style.display = 'flex';
    }

    
});

//Conección al servidor ^^^^^^^^^^^^^^^^^^^^
document.getElementById("start").addEventListener("click", function(){
    if(isConnected){
        console.log("Desconectando...");
        disconnectFromServer();
    }else{
        console.log("Conectando...");
        connectToServer();
    }  
}); 

