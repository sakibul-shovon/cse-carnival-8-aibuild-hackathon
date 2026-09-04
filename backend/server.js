const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

app.use(cors());
app.use(express.json());

app.use('/api/users', require('./routes/users'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/events', require('./routes/events'));
app.use('/agent', require('./routes/agent'));

app.listen(4000, () => console.log('CampusOS backend running on http://localhost:4000'));