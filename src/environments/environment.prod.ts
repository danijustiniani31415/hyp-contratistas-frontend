export const environment = {
    production: true,
    // Ruta RELATIVA a propósito: el SPA siempre habla con el backend de su MISMO dominio.
    // Nginx sirve el frontend estático y proxea /api y /hubs al backend en el mismo servidor.
    apiUrl: '/',
    azure: {
        tenantId: '9fb45b51-6667-4092-8594-2802b0f57c40',
        clientId: 'b5d2ccc7-7ef7-4fc4-b24c-22e743c59305'
    }
};