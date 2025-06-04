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



module.exports = {
  sendEmail};
