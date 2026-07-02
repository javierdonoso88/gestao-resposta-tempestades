import express from 'express';
import cors from 'cors';
import path from 'path';
import simulationRouter from './routes/simulation';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

app.use('/api', simulationRouter);

if (isProd) {
  const clientPath = path.join(__dirname, '../client');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Gestão de Resposta a Tempestades — servidor a correr na porta ${PORT}`);
  if (isProd) {
    console.log(`Serving client from dist/client/`);
  }
});

export default app;
