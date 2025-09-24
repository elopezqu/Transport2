// Cliente HTTP reutilizable - Versión para navegador
class ApiClient {
    constructor() {
        console.log('🚀 ApiClient inicializado');
    }

    async request(endpoint, options = {}) {
        // Usar apiConfig global
        const url = endpoint.startsWith('http') ? endpoint : window.apiConfig.getApiUrl() + endpoint;
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000,
            ...options
        };

        // Añadir token de autenticación si existe
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            console.log('📡 Realizando petición a:', url);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`Error HTTP! estado: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ Error en petición API:', error);
            return { 
                success: false, 
                error: error.message,
                url: url
            };
        }
    }

    // Métodos HTTP específicos
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // Métodos de autenticación
    async login(credentials) {
        const urls = window.apiConfig.getAuthUrls();
        return this.post(urls.login, credentials);
    }

    async register(userData) {
        const urls = window.apiConfig.getAuthUrls();
        return this.post(urls.register, userData);
    }

    // Métodos de usuarios
    async getUsers() {
        const urls = window.apiConfig.getUserUrls();
        return this.get(urls.getUsers);
    }

    async updateLocation(locationData) {
        const urls = window.apiConfig.getLocationUrls();
        return this.post(urls.updateLocation, locationData);
    }

    // Verificar salud del servidor
    async healthCheck() {
        return this.get('/health');
    }
}

// Crear instancia global inmediatamente
window.apiClient = new ApiClient();