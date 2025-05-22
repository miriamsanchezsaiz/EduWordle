const app = require('./app');  
require('dotenv').config();
// const sendTestWelcomeEmail = require('./src/api/services/testEmailSender');


const PORT = process.env.PORT
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

app.listen(PORT, async () => {
  console.log(`Servidor en ejecución en el puerto ${PORT}`);
  // await sendTestWelcomeEmail();

});