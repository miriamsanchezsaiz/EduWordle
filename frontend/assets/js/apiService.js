// frontend/assets/js/apiService.js

import { API_BASE_URL } from './apiConfig.js';

async function callApi(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    // Obtener el token de autenticación del sessionStorage
    const authToken = sessionStorage.getItem('authToken');

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Añadir el header de Autorización si el token existe
    if (authToken) {
        defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers, // Permite sobrescribir o añadir headers específicos
        },
    };

    try {
        const response = await fetch(url, config);

        if (response.status === 401) {
            console.warn("API Service: Acceso no autorizado (401). Limpiando sesión.");
            sessionStorage.clear();
            if (window.location.pathname !== '/login.html') {
                window.location.replace('login.html');
            }
            throw new Error("No autorizado. Por favor, inicie sesión de nuevo.");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Error en la API: ${response.status} ${response.statusText}`);
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error("API Service Error en la petición:", error);
        throw error;
    }
}

export const apiService = {
    login: async (email, password) => {
        return callApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            
        });
    },

    // Aquí irán otras funciones de la API que SÍ se beneficiarán del token añadido por defecto
    // Por ejemplo, para obtener los wordles de un usuario (cuando implementes esa parte)
    /*
    getWordlesByUserId: async (userId) => {
        // callApi ya añadirá el token si existe en sessionStorage
        return callApi(`/wordles/user/${userId}`, {
            method: 'GET',
            // No necesitas headers adicionales para el token aquí
        });
    },

    createWordle: async (wordleData) => {
        // callApi ya añadirá el token si existe en sessionStorage
        return callApi('/wordles', {
            method: 'POST',
            body: JSON.stringify(wordleData)
            // No necesitas headers adicionales para el token aquí
        });
    },
    */
};