//Token MapBox
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2FicmllbDI5LXMiLCJhIjoiY20yMnZvYnExMDJwNzJqcTV3d3J3cmUxdSJ9.fA3z9inzGxKvS2GC_rH20g';

//Variables
let userMarker;

// Ubicacion disponible
let isTracking = false;

//Ruta cargada
let inRoute = false;

//Sockets
let isConnected = false;
let currentRoomId = '';

//Posicion
let latitud = null;
let longitud = null;
let exactitud = null;


//URL_API
//const urlBase = "http://localhost:3000/api";
const urlBase = "https://misdominios.dev";


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
    } else if (userMarker) {
        userMarker.setLngLat([longitude, latitude]);
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
        //Cargar rutas
        getRoutes(data.institution.id);

    } catch (error){
        alert('Error de conexión con el servidor script');
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

// Conectar al servidor de WebSockets
function connectToServer() {
    const username = 'Pasajero';
    //const serverUrl = serverUrlInput.value || 'misdominios.dev';
    //const serverUrl = 'socket.io';
    currentRoomId = 'Viaje';

    // Url Base
    const serverFullUrl = `${urlBase}`;
    
    //console.log(`Conectando a ${serverFullUrl} como ${username} (${userId})`);
    
    // Conectar con el servidor Socket.io
    try {
        socket = io(serverFullUrl, {
            path: '/socket.io/'
        });

        console.log('Socket creado:', socket);
        
        // Configurar manejadores de eventos del socket
        socket.on('connect', () => {
            console.log('Conectado al servidor con ID:', socket.id);
            //debugStatus.textContent = 'Conectado al servidor';
            //debugSocketId.textContent = socket.id;
            
            isConnected = true;
            //connectionIndicator.classList.remove('inactive');
            //connectionIndicator.classList.add('connected');
            //connectionText.textContent = 'Conectado';
            //connectBtn.disabled = true;
            //disconnectBtn.disabled = false;
            //usernameInput.disabled = true;
            //serverUrlInput.disabled = true;
            //roomIdInput.disabled = true;
            
            // pedir existencia de sala
            socket.emit('check-room', currentRoomId);

            // recibir respuesta
            socket.on('room-exists', ({ roomId, exists }) => {
            if (exists) {
                console.log(`La sala ${roomId} existe.`);
                const colorDiv = document.querySelector('.user-color');
                colorDiv.style.backgroundColor = '#4CAF50';
                const textSpan = colorDiv.nextElementSibling;
                textSpan.textContent = "Conectado";

                socket.emit('join-room', {
                    roomId: currentRoomId,
                    userId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    username: username
                });

                socket.emit('send_position', {
                    roomId: currentRoomId,
                    userId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    username: username,
                    latitude: latitud,
                    longitude: longitud,
                    accuracy: exactitud
                });

            } else {
                console.log(`La sala ${roomId} no existe o está vacía.`);
            }
            });
            
            
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
        socket.on('user-location', (data) => {
            console.log('Ubicación recibida de otro usuario:', data);
            //debugStatus.textContent = `Ubicación recibida de ${data.username}`;
            //updateOtherUserPosition(data);
        });
        
        // Recibir ubicaciones existentes al conectarse
        socket.on('existing-locations', (locations) => {
            console.log('Ubicaciones existentes recibidas:', locations);
            //debugStatus.textContent = `Recibidas ${locations.length} ubicaciones existentes`;
            
            // Limpiar marcadores existentes primero
            //removeAllOtherUserMarkers();
            
            locations.forEach(location => {
                //updateOtherUserPosition(location);
            });
            
            //debugUsersCount.textContent = Object.keys(otherUsersMarkers).length;
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
                //const startBtn = document.getElementById('start');
                //startBtn.disabled = false;
                //startBtn.addEventListener('click', connectToServer);
                connectToServer();
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
    //onst removeGpxBtn = document.getElementById('remove-gpx-btn');
    //const gpxFileInput = document.getElementById('gpx-file-input');
    
    loadGpxBtn.addEventListener('click', addGPXToMap);
    
    
    //if (removeGpxBtn) {
    //    removeGpxBtn.addEventListener('click', removeGPXRoute);
    //}
    
    //if (gpxFileInput) {
    //    gpxFileInput.addEventListener('change', function() {
    //        if (this.files.length > 0) {
    //            loadGPXFromLocalFile();
    //        }
    //    });
    //}

}


// Inicializar la aplicación cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    
    initMap();
    startTracking();
    

    //Parametro
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    console.log("parametro :", id);

    //Institucion
    getInstitution(id);

    //Inicio
    document.getElementById('start').disabled = true;
    
    
});