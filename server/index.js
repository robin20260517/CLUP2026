require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fixturesRouter = require('./routes/fixtures');
const oddsRouter = require('./routes/odds');
const liveRouter = require('./routes/live');
const engineRouter = require('./routes/engine');
const polymarketRouter = require('./routes/polymarket');
const h2hWcRouter = require('./routes/h2h_wc');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/fixtures', fixturesRouter);
app.use('/api/odds', oddsRouter);
app.use('/api/live', liveRouter);
app.use('/api/engine', engineRouter);
app.use('/api/polymarket', polymarketRouter);
app.use('/api/h2h/wc', h2hWcRouter);

app.get('/api/health', (req, res) => {
  const elo = require('./engine/elo');
  res.json({ status: 'ok', time: new Date().toISOString(), elo2026Matches: elo.getProcessedCount() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`WC Quant Server → http://localhost:${PORT}`);
  // Pre-warm historical data in background after startup
  setTimeout(async () => {
    try {
      const { getAllMatches, getGoalStats } = require('./data/wc_data');
      const { buildHistoricalELO } = require('./engine/historical_elo');
      const elo = require('./engine/elo');

      const [matches, goalStats, histELO] = await Promise.all([
        getAllMatches(),
        getGoalStats(),
        buildHistoricalELO(),
      ]);

      elo.setHistoricalELO(histELO);
      elo.setBaseLambda(goalStats.allLambda);
      console.log(`[boot] WC data ready: ${matches.length} matches, lambda=${goalStats.allLambda.toFixed(3)}`);
    } catch (e) {
      console.error('[boot] WC data pre-warm failed:', e.message);
    }
  }, 3000);
});
