// src/api/services/emailService.js
const { Resend } = require('resend');

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); 
const resend = new Resend(process.env.RESEND_API_KEY);
const ApiError = require('../../utils/ApiError');


// Función genérica para enviar emails
const sendEmail = async (to, subject, text, html) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject,
      text,
      html
    });

    if (error) {
      console.debug('Error sending email:', error);
      throw ApiError.internal('Error sending email', [error.message]);
    }

    console.log('Email sent:', data.id);
    return data;
  } catch (err) {
    console.debug('Unexpected error sending email:', err);
    throw ApiError.internal('Unexpected error sending email', [err.message]);
  }
};

async function sendWelcomeEmail(to, name, password) {
   const htmlTemplate = fs.readFileSync(('./src/utils/email/templates/welcome.html'), 'utf8');

   const imagePath = path.resolve(__dirname, '../../utils/email/img/header.png');
   let base64Image = null;
   try {
     const imageBuffer = fs.readFileSync(imagePath);
     base64Image = imageBuffer.toString('base64');
   } catch (error) {
     console.error('Error al leer el archivo de la imagen:', error);
     return;
   }

   const htmlContent = htmlTemplate
     .replace('{{name}}', name)
     .replace('{{password}}', password)
     .replace('src="image"', `src="data:image/png;base64,${base64Image}"`);
    

   const plainTextBody = fs.readFileSync(('./src/utils/email/templates/welcomePlain.txt'), 'utf8');;
   const plainTextContent = plainTextBody
     .replace('{{name}}', name)
     .replace('{{password}}', password);


   try {

     const response = await resend.emails.send({
       from: 'EduWordle <eduWordle@resend.dev>',
       to,
       subject: 'Welcome to EduWordle!',
       html: htmlContent,
       text: plainTextContent
     });
     console.log('Correo enviado:', response);
   } catch (error) {
     console.error('Error enviando el correo:', error);
   }
  return true;
}


module.exports = {
  sendWelcomeEmail,
  sendEmail};
