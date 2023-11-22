import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { query } from 'express-validator';
import searchController from './controllers/searchController';

dotenv.config();

const app: Express = express();
app.use(cors());

app.get('/movies/search', [
  query('input')
    .isString().trim().withMessage('search term is missing')
    .isLength({ min: 3 }).withMessage('Search term must be at least 3 characters'),
  query('page')
    .isInt({ min: 1 }).withMessage('Page must be greather than 0'),
], searchController);

app.get('/health-check', (_: Request, res: Response) => {
  res.json({ success: true });
});

app.listen(process.env.PORT, () => {
  console.log(`Movies API is running at ${process.env.APP_URL}:${process.env.PORT}`);
});
