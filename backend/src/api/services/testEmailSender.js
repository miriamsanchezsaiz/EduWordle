// src/utils/testEmailSender.js
const { sendWelcomeEmail } = require('./emailService');

// Función que simula el registro de un usuario de prueba
const sendTestWelcomeEmail = async () => {
    try {
        await sendWelcomeEmail(
            'elenita147@hotmail.com',
            'Elena',
            'clave1234'
        );
        console.log('Correo de prueba enviado correctamente.');
    } catch (error) {
        console.error('Error al enviar correo de prueba:', error);
    }
};


module.exports = sendTestWelcomeEmail;
