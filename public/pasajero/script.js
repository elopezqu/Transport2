//Token MapBox
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2FicmllbDI5LXMiLCJhIjoiY20yMnZvYnExMDJwNzJqcTV3d3J3cmUxdSJ9.fA3z9inzGxKvS2GC_rH20g';

//Id usuario
let id = '';

//Variables
let userMarker;
let otherUsersMarkers = {};

// Ubicacion disponible
let isTracking = false;

//Ruta cargada
let inRoute = false;
//Socket y variables de geolocalización
let watchId = null;
let updateTimerId = null;
let lastGeoPosition = null;

//Sockets
let isConnected = false;
let currentRoomId = '';
let userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
let socket = null;
let nombre = '';

//Posicion
let latitud = null;
let longitud = null;
let exactitud = null;

//Institucion
let institucion = '';

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

// Colores para los diferentes usuarios
const userColors = '#b61e13ff';



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
        enableHighAccuracy: true, // ya lo usas: importante
        maximumAge: 0,            // no usar caché (devuelve la posición más reciente real)
        timeout: 60000            // más tolerancia para obtener una lectura GPS precisa
    };
    
    // Obtener ubicación actual (solo actualizar cache)
    navigator.geolocation.getCurrentPosition(
        position => { lastGeoPosition = position; updatePosition(position); },
        error => handleError(error),
        options
    );
    
    // Observar cambios de ubicación: solo actualizar cache, no llamar updatePosition directamente
    watchId = navigator.geolocation.watchPosition(
        position => { lastGeoPosition = position; },
        error => handleError(error),
        options
    );

    // Llamar updatePosition cada segundo usando el último valor cacheado
    if (updateTimerId) clearInterval(updateTimerId);
    updateTimerId = setInterval(() => {
        if (lastGeoPosition) {
            updatePosition(lastGeoPosition);
        }
    }, 1000);
}

// Actualizar la posición en el mapa
function updatePosition(position) {
    const { latitude, longitude, accuracy } = position.coords;

    // Update global position variables
    latitud = latitude;
    longitud = longitude;
    exactitud = accuracy;

    console.log('RAW pos', latitud, longitud, 'acc (m):', exactitud);
    
    // Actualizar la interfaz con las coordenadas
    //latElement.textContent = latitude.toFixed(6);
    //lngElement.textContent = longitude.toFixed(6);
    //accuracyElement.textContent = accuracy.toFixed(2);
    
    const MAX_ACCEPTED_ACCURACY = 6000; // metros, ajusta según tu caso
    if (accuracy > MAX_ACCEPTED_ACCURACY) {
        //debugStatus.textContent = `Ignorando lectura por baja precisión (${Math.round(accuracy)} m)`;
        // opcional: seguir esperando mejores lecturas sin hacer flyTo ni emitir al servidor
        return;
    }
    
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
        el.style.backgroundColor = '#4269e1';
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
    }
    
    // Enviar la ubicación al servidor si está conectado
    if (isConnected && socket) {
        
        const locationData = {
            userId: id,
            username: nombre,
            roomId: currentRoomId,
            userRol: 'pasajero',
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            sendTime: Date.now(), // Timestamp en milisegundos para calcular latencia
            timestamp: new Date().toISOString()
        };
        
        socket.emit('location-update', locationData, 'pasajero');
    }
}

// Manejar errores de geolocalización
function handleError(error) {
    console.error('Error obteniendo la ubicación:', error);
    //debugStatus.textContent = `Error de geolocalización: ${error.message}`;
    
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
}

// Actualizar la ubicación de otro usuario en el mapa
function updateOtherUserPosition(userData) {
    // No actualizar nuestra propia ubicación
    if (userData.userId === id) return;
    
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
        
    }
}

// Eliminar marcador de usuario desconectado
function removeOtherUserMarker(userId) {
    if (otherUsersMarkers[userId]) {
        otherUsersMarkers[userId].remove();
        delete otherUsersMarkers[userId];
    }
}

// Eliminar todos los marcadores de otros usuarios
function removeAllOtherUserMarkers() {
    for (const userId in otherUsersMarkers) {
        otherUsersMarkers[userId].remove();
    }
    otherUsersMarkers = {};
}



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

// Preguntar por sala y conductor
function isRoom(){
    // Url Base
    const serverFullUrl = `${urlBase}`;
    
    // Conectar con el servidor Socket.io
    try {
        socket = io(serverFullUrl, {
            path: '/socket.io/'
        });
        
        // Configurar manejadores de eventos del socket
        socket.on('connect', () => {
            
            // Pedir existencia de sala
            socket.emit('check-room', currentRoomId);

            // Recibir respuesta
            socket.on('room-exists', ({ roomId, conductor }) => {
            console.log(`Respuesta de existencia de sala para ${roomId}:`, conductor);
            if (conductor) {
                console.log(`La sala ${roomId} existe.`);
                //Actualizar interfaz
                const userDriver = document.getElementById("user-driver");
                userDriver.textContent = `${conductor[0].username}`;
                const colorDiv = document.querySelector('.user-color');
                colorDiv.style.backgroundColor = '#4CAF50';
                const textSpan = colorDiv.nextElementSibling;
                textSpan.textContent = "Conectado";
                document.getElementById('start').disabled = false;

            } else {
                console.log(`La sala ${roomId} no existe o está vacía.`);
                const userDriver = document.getElementById("user-driver");
                userDriver.textContent = `No asignado`;
                const colorDiv = document.querySelector('.user-color');
                colorDiv.style.backgroundColor = '#707174';
                const textSpan = colorDiv.nextElementSibling;
                textSpan.textContent = "Desconectado";
                document.getElementById('start').disabled = true;

            }
            });
            
            
        });
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        alert('Error al conectar con el servidor. Verifica la URL.');
    }
}


// Conectar al servidor de WebSockets
function connectToServer() {

    //Configuraciones boton start
    const startBtn = document.getElementById('start');
    startBtn.textContent = "Finalizar el viaje";
    startBtn.style.backgroundColor = "#e14f42";

    // Url Base
    const serverFullUrl = `${urlBase}`;
    
    // Conectar con el servidor Socket.io
    try {
        socket = io(serverFullUrl, {
            path: '/socket.io/'
        });
        
        // Configurar manejadores de eventos del socket
        socket.on('connect', () => {
            console.log('Conectado al servidor con ID:', socket.id);

            //Conectado
            isConnected = true;

            socket.emit('join-room', {
                roomId: currentRoomId,
                userId: id,
                username: nombre,
                userRol: 'pasajero'
            });

            // Solicitar ubicaciones existentes
            socket.emit('request-locations', currentRoomId, 'pasajero');
  
        });
            
        
        socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            //debugStatus.textContent = 'Desconectado del servidor';
            handleDisconnection();
        });
        
        socket.on('connect_error', (error) => {
            console.error('Error de conexión:', error);
            //debugStatus.textContent = `Error de conexión: ${error.message}`;
            alert(`Error al conectar con el servidor: ${error.message}`);
            handleDisconnection();
        });
        
        // Recibir ubicación de otro usuario
        socket.on('user-location', (userData) => {
            if(userData.userRol !== 'conductor') return;
            else{  
                const receiveTime = Date.now();
                const networkLatency = userData.sendTime ? receiveTime - userData.sendTime : null;
                
                console.log('Ubicaciones conductor:', userData);
                console.log(`Ubicación recibida de ${userData.username}`);
                if (networkLatency !== null) {
                    console.log(`[hora de recepción] ${receiveTime} -  ${userData.sendTime} [hora de envío] = ${networkLatency}ms`);
                    console.log(`[LATENCIA RED] ${networkLatency}ms desde ${userData.username}`);
                    userData.networkLatency = networkLatency; // Agregar al objeto para mostrarlo en el popup
                    
                    console.log("antes de guardar :", userData.accuracy);
                    // Guardar métricas en base de datos
                    savePerformanceMetrics({
                        userId: userData.userId,
                        latencia: networkLatency,
                        precision: userData.accuracy.toFixed(1)
                    });
                }
                
                updateOtherUserPosition(userData);
            }
        });
        
        // Recibir ubicaciones existentes al conectarse
        socket.on('existing-locations', (location) => {
            console.log('Ubicaciones conductor:', location);
            
            // Limpiar marcadores existentes primero
            removeAllOtherUserMarkers();
            //Agregar marcador
            location.forEach(location => {
                updateOtherUserPosition(location);
            });
            
        });
        
        // Usuario conectado
        socket.on('user-connected', (userData) => {
            console.log('Usuario conectado:', userData);
            //debugStatus.textContent = `${userData.username} se ha conectado`;
            
            // Actualizar lista de usuarios
            //updateUserList(userData, getColorForUserId(userData.userId), 'add');
        });
        
        // Usuario desconectado
        socket.on('user-disconnected', (userData) => {
            console.log('Usuario desconectado:', userData);
            //debugStatus.textContent = `${userData.username} se ha desconectado`;
            //removeOtherUserMarker(userData.userId);
            
            // Actualizar lista de usuarios
            //updateUserList(userData, null, 'remove');
        });
        
        // Confirmación de unión a sala
        //socket.on('room-joined', (data) => {
            //console.log('Unido a la sala:', data);
            //debugStatus.textContent = `Unido a la sala: ${data.roomId}`;
        //});
        
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        //debugStatus.textContent = `Error: ${error.message}`;
        alert('Error al conectar con el servidor. Verifica la URL.');
    }
}

// Manejar la desconexión
function handleDisconnection() {
    isConnected = false;
    
    // Eliminar marcadores de otros usuarios
    removeAllOtherUserMarkers();
    
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
                    'line-color': '#3887be',  // Color azul
                    'line-width': 4,          // Grosor
                    'line-opacity': 0.8
                }
            });
            inRoute = true;
            
            if(isTracking && inRoute){
                //Nombre de sala completo
                currentRoomId = `${institution}-${select.options[select.selectedIndex].text}`;
                console.log(`Sala actual: ${currentRoomId}`);  
                isRoom();
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

    //Nombre Usuario
    getNombreUsuario(id);

    //Inicio
    document.getElementById('start').disabled = true;
    
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