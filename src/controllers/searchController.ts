import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../types/types';
import * as Cache from '../helpers/cache';
import { fetchMovies } from '../helpers/movies';


export default async (req: Request, res: Response) => {

  /**
   * Check validation errors
   * Return if any
   */
  const errors = <ValidationError[]>validationResult(req).array();

  if (errors.length > 0) {
    return res
      .status(400)
      .json(errors.map((error: ValidationError) => {
        return {
          param: error.path,
          error: error.msg,
        }
      }))
      .end();
  }

  /**
   * Transform query params
   */
  const searchTermRaw = req.query.input?.toString()!;
  const page = parseInt(req.query.page!.toString());

  /**
   * Check if query results are in cache
   */
  const cacheResult = await Cache.get(searchTermRaw, page);

  if (cacheResult.inCache) {
    return res.status(200).json({
      source: 'CACHE',
      data: cacheResult.data,
    });
  }

  /**
   * Fetch movies data from TMDB API
   */
  try {
    const resp = await fetchMovies(searchTermRaw, page);

    /**
     * Store TMDB response in cache
     */
    try {
      await Cache.set(searchTermRaw, page, resp.data);
    } catch (err) {
      // TODO: log error in db
      console.log(err);
    }

    return res.status(200).json({
      source: 'TMDB_API',
      data: resp.data,
      error: resp.error
    });
  } catch (err) {
    // TODO: handle error
    console.log(err);

    return res.status(500).json({
      data: [],
      error: 'An unexpected error occured.',
    });
  }

}