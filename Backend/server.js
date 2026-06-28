const mongoose = require('mongoose');
require('dotenv').config();

const app = require('./app');

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('MongoDB connesso.');
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Server attivo sulla porta ${process.env.PORT || 5000}`);
    });
}).catch((error) => {
    console.error('Errore connessione MongoDB:', error);
    process.exit(1);
});
