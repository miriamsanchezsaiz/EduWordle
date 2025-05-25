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


    /**
     * Obtiene los grupos para el usuario logeado (profesor o alumno).
     * El backend usa el token para saber quién hace la petición.
     * @param {string} role El rol del usuario ('teacher' o 'student').
     * @returns {Promise<Array<object>>} Un array de objetos de grupo.
     */
    fetchGroups: async (role) => {
        if (role === 'teacher') {
            return callApi('/teacher/groups', { method: 'GET' });
        } else if (role === 'student') {
            return callApi('/student/groups/active', { method: 'GET' });
        } else {
            throw new Error("Rol de usuario desconocido para obtener grupos.");
        }
    },

    /**
     * Obtiene los wordles para el usuario logeado (profesor o alumno).
     * El backend usa el token para saber quién hace la petición.
     * @param {string} role El rol del usuario ('teacher' o 'student').
     * @returns {Promise<Array<object>>} Un array de objetos wordle.
     */
    fetchWordles: async (role) => {
        if (role === 'teacher') {
            return callApi('/teacher/wordles', { method: 'GET' });
        } else if (role === 'student') {
            return callApi('/student/wordles/accessible', { method: 'GET' });
        } else {
            throw new Error("Rol de usuario desconocido para obtener wordles.");
        }
    },

    /**
     * Obtiene los wordles asociados a un grupo específico.
     * @param {string} groupId El ID del grupo.
     * @returns {Promise<object>} Un objeto con la propiedad `wordles` (array de wordles).
     */
    fetchWordlesForGroup: async (groupId) => {
        // Asumo que esta ruta `/grupos/:groupId` sigue siendo accesible
        // y devuelve los wordles asociados al grupo.
        // Si esta ruta es solo para profesores, el backend lo debería validar con el token.
        return callApi(`/teacher/groups/${groupId}`, { method: 'GET' }); // Usamos la ruta de teacher
    },


    // Crear un grupo (solo profesor)
    createGroup: async (groupData) => {
        return callApi('/teacher/groups', {
            method: 'POST',
            body: JSON.stringify(groupData),
        });
    },

    // Obtener detalles de un grupo (solo profesor)
    getGroupDetails: async (groupId) => {
        return callApi(`/teacher/groups/${groupId}`, { method: 'GET' });
    },

    // Actualizar un grupo (solo profesor)
    updateGroup: async (groupId, groupData) => {
        return callApi(`/teacher/groups/${groupId}`, {
            method: 'PUT',
            body: JSON.stringify(groupData),
        });
    },

    // Crear un wordle (solo profesor)
    createWordle: async (wordleData) => {
        return callApi('/teacher/wordles', {
            method: 'POST',
            body: JSON.stringify(wordleData),
        });
    },

    // Obtener detalles de un wordle (profesor)
    getWordleDetails: async (wordleId) => {
        return callApi(`/teacher/wordles/${wordleId}`, { method: 'GET' });
    },

    // Actualizar un wordle (profesor)
    updateWordle: async (wordleId, wordleData) => {
        return callApi(`/teacher/wordles/${wordleId}`, {
            method: 'PUT',
            body: JSON.stringify(wordleData),
        });
    },

    // Obtener ranking de un grupo (solo profesor)
    getGroupStudentRanking: async (groupId) => {
        return callApi(`/teacher/groups/${groupId}/ranking`, { method: 'GET' });
    },

    // Obtener datos de juego para un wordle (alumno)
    getWordleGameData: async (wordleId) => {
        return callApi(`/student/wordles/${wordleId}/game-data`, { method: 'GET' });
    },

    // Guardar resultado de juego (alumno)
    saveGameResult: async (wordleId, resultData) => {
        return callApi(`/student/games/${wordleId}/save-result`, {
            method: 'POST',
            body: JSON.stringify(resultData),
        });
    },

    // Cambiar contraseña (profesor o alumno)
    changePassword: async (role, passwordData) => {
        return callApi(`/${role}/change-password`, {
            method: 'PUT',
            body: JSON.stringify(passwordData),
        });
    },
};