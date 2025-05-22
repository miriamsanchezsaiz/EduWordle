// src/utils/passwordUtils.js
const bcrypt = require('bcrypt');

const PASSWORD_SALT_ROUNDS = 10; // Número de rondas de sal para bcrypt


function isStrongPassword(password) {
    if (password.length < 8) {
        return false;
    }
    if (!/[A-Z]/.test(password)) { 
        return false;
    }
    if (!/[a-z]/.test(password)) { 
        return false;
    }
    if (!/[0-9]/.test(password)) { 
        return false;
    }

    // Símbolos permitidos: <, >, _, ., !, @, #, $, %, ^, &, *, (, ), -, +, =, {, }, [, ], |, \, ;, :, ', ", ,, <, ., >, /, ?
    const symbolRegex = /[<>_.,!@#$%^&*()\-\+=\[\]{}|\\;:'"/?]/;
    if (!symbolRegex.test(password)) {
        return false;
    }
    return true;
}

/**
 * Genera una contraseña inicial "débil" a partir de los datos del alumno (ej. email).
 * Esta contraseña NO debería cumplir con los requisitos de isStrongPassword.
 */
function generateInitialPassword(email) {
    // Ejemplo: primeras 2 letras del email (minúsculas) + últimos 4 dígitos del timestamp actual + '!'

    const emailPart = email.split('@')[0].substring(0,2).toLowerCase();
    const nowSuffix = Date.now().toString().slice(-4);
    
    // Esta contraseña no tiene mayúsculas ni símbolos complejos si los requisitos son estrictos.
    const weakPassword = `${emailPart}${nowSuffix}!`; 

    // Es CRÍTICO que esta contraseña generada consistentemente NO sea fuerte.
    // Una buena estrategia es omitir uno o más de los requisitos obligatorios (ej. mayúscula al principio o ciertos símbolos).
    if (isStrongPassword(weakPassword)) {
        console.warn("Advertencia: La contraseña inicial generada es sorprendentemente fuerte. ¡Revisar lógica de generateInitialPassword!");
   
    }

    return weakPassword;
}



module.exports = {
    isStrongPassword,
    generateInitialPassword
};