require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fixturesRouter = require('./routes/fixtures');
const oddsRouter = require('./routes/odds');
const liveRouter = require('./routes/live');
const engineRouter = require('./routes/engine');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

app.use('/api/fixtures', fixturesRouter);
app.use('/api/odds', oddsRouter);
app.use('/api/live', liveRouter);
app.use('/api/engine', engineRouter);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () =>
  console.log(`WC Quant Server → http://localhost:${PORT}`)
);
