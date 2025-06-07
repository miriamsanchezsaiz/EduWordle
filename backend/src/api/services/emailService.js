// src/api/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const ApiError = require('../../utils/ApiError');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Función genérica para enviar emails
const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { id: info.messageId };
  } catch (err) {
    console.debug('Unexpected error sending email:', err);
    throw ApiError.internal('Unexpected error sending email', [err.message]);
  }
};
async function sendWelcomeEmail(to, name, password) {
  const htmlTemplate = fs.readFileSync(('./src/utils/email/templates/welcome.html'), 'utf8');
  const plainTextBody = fs.readFileSync(('./src/utils/email/templates/welcomePlain.txt'), 'utf8');;
  const AppUrl = process.env.APP_URL;
  const headerImageUrl = `${AppUrl}/public/img/header.png`;


  const htmlContent = htmlTemplate
    .replace('{{name}}', name)
    .replace('{{password}}', password)
    .replace(/{{frontendUrl}}/g, AppUrl)
    .replace('{{headerImageUrl}}', headerImageUrl);



  const plainTextContent = plainTextBody
    .replace('{{name}}', name)
    .replace('{{password}}', password);


  try {

    const response = await sendEmail(
      to,
      'Welcome to EduWordle!',
      plainTextContent,
      htmlContent
    );
    console.log('Correo enviado:', response);
    return true;
  } catch (error) {
    console.error('Error enviando el correo:', error);
    return false;
  }
}


module.exports = {
  sendWelcomeEmail,
  sendEmail
};
