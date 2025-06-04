// src/utils/passwordUtils.js

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
    // Método usado: primeras 2 letras del email (minúsculas) + últimos 4 dígitos del timestamp actual + '!'
    const emailPart = email.split('@')[0].substring(0,2).toLowerCase();
    const nowSuffix = Date.now().toString().slice(-4);
    
    const weakPassword = `${emailPart}${nowSuffix}!`; 

    // Es CRÍTICO que esta contraseña generada consistentemente NO sea fuerte. -> checkeamos
    if (isStrongPassword(weakPassword)) {
        console.warn("Advertencia: La contraseña inicial generada es sorprendentemente fuerte. ¡Revisar lógica de generateInitialPassword!");
    }

    return weakPassword;
}



module.exports = {
    isStrongPassword,
    generateInitialPassword
};