// Configuración centralizada de APIs - Versión para navegador
class ApiConfig {
    constructor() {
        this.environments = {
            development: {
                baseUrl: 'http://localhost:3000',
                apiVersion: '/api'
            },
            production: {
                baseUrl: 'https://tu-dominio.com',
                apiVersion: '/api'
            }
        };
        
        this.currentEnv = this.getCurrentEnvironment();
        this.config = this.environments[this.currentEnv];
        
        console.log('🔧 Configuración cargada para entorno:', this.currentEnv);
        console.log('🌐 URL Base:', this.getBaseUrl());
    }

    getCurrentEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else {
            //return 'production';
            return 'development';
        }
    }

    getBaseUrl() {
        return this.config.baseUrl;
    }

    getApiUrl() {
        return this.config.baseUrl + this.config.apiVersion;
    }

    // URLs específicas de la API
    getAuthUrls() {
        const base = this.getApiUrl();
        return {
            login: `${base}/auth/login`,
            register: `${base}/auth/register`,
            logout: `${base}/auth/logout`,
            profile: `${base}/auth/profile`
        };
    }

    getUserUrls() {
        const base = this.getApiUrl();
        return {
            getUsers: `${base}/users`,
            getUserById: (id) => `${base}/users/${id}`,
            updateUser: (id) => `${base}/users/${id}`
        };
    }

    getLocationUrls() {
        const base = this.getApiUrl();
        return {
            updateLocation: `${base}/locations`,
            getLocationHistory: (userId) => `${base}/locations/history/${userId}`
        };
    }

    getSocketUrl() {
        return this.config.baseUrl;
    }
}

// Crear instancia global inmediatamente
window.apiConfig = new ApiConfig();