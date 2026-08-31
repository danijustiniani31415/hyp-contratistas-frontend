export const environment = {
    production: true,
    // Ruta RELATIVA a propósito: el SPA siempre habla con el backend de su MISMO dominio.
    // Nginx sirve el frontend estático y proxea /api y /hubs al backend en el mismo servidor.
    apiUrl: '/',
    azure: {
        tenantId: 'PENDIENTE_TENANT_ID_EMPRESA',
        clientId: 'PENDIENTE_CLIENT_ID_EMPRESA'
    }
};
