// Configuración centralizada de APIs - Versión para navegador
export class ApiConfig {
    constructor() {
        this.environments = {
            development: {
                baseUrl: 'http://localhost:3000',
                apiVersion: '/api'
            },
            production: {
                baseUrl: 'https://misdominios.dev',
                apiVersion: '/api'
            }
        };
        
        this.currentEnv = this.getCurrentEnvironment(1);
        this.config = this.environments[this.currentEnv];
        
        console.log('🔧 Configuración cargada para entorno:', this.currentEnv);
        console.log('🌐 URL Base:', this.getBaseUrl());
    }

    getCurrentEnvironment(num) {
        
        if (num == 1) {
            return 'development';
        } else {
            return 'production';
        }
    }

    getBaseUrl() {
        return this.config.baseUrl;
    }

    getApiUrl() {
        return this.config.baseUrl + this.config.apiVersion;
    }

}

