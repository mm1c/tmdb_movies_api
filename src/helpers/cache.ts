import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { ApiRequestItem, CacheGetResponse, HitCounterUpdateType } from '../types/types';
import { getDateStr, getKeyStr } from './utils';

dotenv.config();


let DOC_CLIENT: DocumentClient | undefined;

/**
 * Initialize AWS client
 * 
 * @returns DocumentClient
 */
const getDocClient = (): DocumentClient => {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'eu-north-1',
  });

  if (!DOC_CLIENT) {
    DOC_CLIENT = new AWS.DynamoDB.DocumentClient();
  }

  return DOC_CLIENT;
}

/**
 * Get from cache
 * 
 * @param searchTerm 
 * @param page 
 * @returns 
 */
export const get = async (searchTerm: string, page: number): Promise<CacheGetResponse> => {
  const CACHE_TIMEOUT = parseInt(process.env.CACHE_TIMEOUT ?? '2');

  try {
    const dbResponse = await getDocClient()
      .query({
        TableName: process.env.CACHE_TABLE_NAME!,
        ExpressionAttributeNames: {
          '#search_term': 'search_term',
          '#created_at': 'created_at',
          '#page': 'page',
        },
        ExpressionAttributeValues: {
          ':search_term_value': searchTerm,
          ':created_at_value': (new Date()).getTime() - CACHE_TIMEOUT * 60 * 1000,
          ':page_value': page,
        },
        KeyConditionExpression: '#search_term = :search_term_value AND #created_at > :created_at_value',
        FilterExpression: '#page = :page_value'
      })
      .promise();

    if (dbResponse.Items!.length > 0) {
      /**
       * Update cache hit counter
       */
      await setHitCounter(HitCounterUpdateType.GET, searchTerm, page);

      return {
        inCache: true,
        data: dbResponse.Items?.map(item => item.data)[0],
      }
    }

    return { inCache: false };

  } catch (err: any) {
    // TODO: log error in db
    console.log(err);

    return {
      inCache: false,
      error: err,
    };
  }
}

/**
 * Set in cache
 * 
 * @param searchTerm 
 * @param page 
 * @param data 
 * @returns 
 */
export const set = async (searchTerm: string, page: number, data: any) => {
  /**
   * Update cache hit counter
   */
  await setHitCounter(HitCounterUpdateType.SET, searchTerm, page);

  /**
   * Set cache
   */
  try {
    await getDocClient()
      .put({
        TableName: process.env.CACHE_TABLE_NAME!,
        Item: {
          search_term: searchTerm,
          created_at: (new Date()).getTime(),
          page: page,
          data: data,
        }
      })
      .promise();

    return true;
  } catch (err) {
    // TODO: log error in db
    console.log(err);

    return false;
  }
}

/**
 * Set api request hit counter
 * 
 * @param type 
 * @param searchTerm 
 * @param page 
 */
const setHitCounter = async (type: HitCounterUpdateType, searchTerm: string, page: number) => {
  /**
   * DOCUMENTATION:
   * *****************
   * SET:
   * 1. if item does NOT exist:
   * - date, key
   * - total hits: 1
   * - cache hits: 0
   * 
   * 2. if item exists
   * - date, key
   * - total hits ++
   * - cache hits +0
   * 
   * GET:
   * 1. if item does NOT exist:
   * - date, key
   * - total hits: 1
   * - cache hits: 1
   * 
   * 2. if item exists:
   * - date, key
   * - total hits ++
   * - cache hits ++
   */

  const dbItem = await getItem(searchTerm, page);

  /**
   * update hit counter in DB
   */
  switch (type) {
    case HitCounterUpdateType.SET:
      if (dbItem === null) {
        setItem({
          date: getDateStr(),
          key: getKeyStr(searchTerm, page),
          total_hits: 1,
          cache_hits: 0,
        });
      } else {
        setItem({
          date: getDateStr(),
          key: getKeyStr(searchTerm, page),
          total_hits: (<ApiRequestItem>dbItem).total_hits + 1,
          cache_hits: (<ApiRequestItem>dbItem).cache_hits,
        });
      }

      break;

    case HitCounterUpdateType.GET:
      if (dbItem === null) {
        setItem({
          date: getDateStr(),
          key: getKeyStr(searchTerm, page),
          total_hits: 1,
          cache_hits: 1,
        });
      } else {
        setItem({
          date: getDateStr(),
          key: getKeyStr(searchTerm, page),
          total_hits: (<ApiRequestItem>dbItem).total_hits + 1,
          cache_hits: (<ApiRequestItem>dbItem).cache_hits + 1,
        });
      }

      break;
  }
}

/**
 * Get api request counter for a search term and a page number
 * 
 * @param searchTerm 
 * @param page 
 * @returns 
 */
const getItem = async (searchTerm: string, page: number): Promise<ApiRequestItem | null | false> => {
  try {
    const dbResponse = await getDocClient()
      .query({
        TableName: process.env.REQUESTS_TABLE_NAME!,
        ExpressionAttributeNames: {
          '#date': 'date',
          '#key': 'key',
        },
        ExpressionAttributeValues: {
          ':date_value': getDateStr(),
          ':key_value': getKeyStr(searchTerm, page),
        },
        KeyConditionExpression: '#date = :date_value AND #key = :key_value'
      })
      .promise();

    if (dbResponse.Items && dbResponse.Items!.length > 0) {
      return <ApiRequestItem>dbResponse.Items[0];
    }

    return null;

  } catch (err: any) {
    // TODO: log error in db
    console.log(err);

    return false;
  }
}

/**
 * Set api request item for search term and page number
 * 
 * @param item 
 * @returns 
 */
const setItem = async (item: ApiRequestItem) => {
  try {
    await getDocClient()
      .put({
        TableName: process.env.REQUESTS_TABLE_NAME!,
        Item: item,
      })
      .promise();

    return true;
  } catch (err) {
    // TODO: log error in db
    console.log(err);

    return false;
  }
}
