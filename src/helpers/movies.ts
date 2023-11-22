import axios from "axios";
import { MoviesResponse, TMDBQueryParams } from "../types/types";


export const fetchMovies = async (searchTermRaw: string, page: number): Promise<MoviesResponse> => {

  /**
   * Fetch movies from TMDB
   */
  const queryParamsToRequest: TMDBQueryParams[] = [
    { key: 'include_adult', value: false }, // hard coded
    { key: 'language', value: 'en-US' }, // hard coded
    { key: 'query', value: encodeURI(searchTermRaw!) },
    { key: 'page', value: page },
  ];

  const queryStr = queryParamsToRequest.map(param => `${param.key}=${param.value}`).join('&');

  try {
    const resp = await axios.get(
      `${process.env.TMDB_API_URL}/search/movie?${queryStr}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TMDB_API_TOKEN}`
        }
      });

    return {
      success: true,
      data: resp.data,
    }

  } catch (err) {
    // TODO: log error in db
    console.log(err);

    return {
      success: false,
      error: 'Some error occured upon fetching the movies from the API',
    };
  }
}