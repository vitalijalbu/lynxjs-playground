import type { HttpError } from './types.js';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface HttpRequest {
  method?: HttpMethod;
  /** Absolute URL, or a path joined to `baseURL`. */
  url: string;
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface HttpClientOptions {
  baseURL: string;
  /** Read on every request, so locale/token changes apply immediately. */
  headers?: () => Record<string, string>;
  timeoutMs?: number;
  /** GET retries on 429, honouring `Retry-After` (same policy as the web app). */
  rateLimitRetries?: number;
}

export interface HttpClient {
  baseURL: string;
  request<T>(request: HttpRequest): Promise<T>;
}

const RATE_LIMIT_BASE_DELAY_MS = 600;

/**
 * Lynx ships no URLSearchParams on every engine version and the polyfill does
 * not encode brackets the way Laravel's `filter[x]` parser expects, so the
 * query string is built by hand.
 */
export function buildQueryString(query: QueryParams = {}): string {
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function joinUrl(baseURL: string, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Lynx's fetch has no AbortController guarantee across engine versions:
 * time out by racing instead of aborting.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, url: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(toHttpError(408, `Request timeout after ${ms / 1000}s: ${url}`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function toHttpError(statusCode: number, message: string, errors?: HttpError['errors']): HttpError {
  return { message, statusCode, errors };
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = Number(response.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 5000);
  return RATE_LIMIT_BASE_DELAY_MS * (attempt + 1);
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { baseURL, timeoutMs = 30_000, rateLimitRetries = 2 } = options;

  async function send(request: HttpRequest): Promise<Response> {
    'background only';
    const method = (request.method ?? 'get').toUpperCase();
    const url = joinUrl(baseURL, request.url) + buildQueryString(request.query);
    const hasBody = request.body !== undefined && request.body !== null;

    return withTimeout(
      fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers?.(),
          ...request.headers,
        },
        body: hasBody ? JSON.stringify(request.body) : undefined,
      }),
      timeoutMs,
      url,
    );
  }

  async function request<T>(request: HttpRequest): Promise<T> {
    'background only';
    let response: Response;
    try {
      response = await send(request);
      const isGet = (request.method ?? 'get') === 'get';
      for (let attempt = 0; isGet && response.status === 429 && attempt < rateLimitRetries; attempt++) {
        await sleep(retryDelay(response, attempt));
        response = await send(request);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      throw toHttpError(0, `Network error: ${reason}`);
    }

    const body = await readBody(response);

    if (!response.ok) {
      const payload = (body && typeof body === 'object' ? body : {}) as {
        message?: string;
        errors?: HttpError['errors'];
      };
      throw toHttpError(
        response.status,
        payload.message || `HTTP ${response.status}`,
        payload.errors,
      );
    }

    return body as T;
  }

  return { baseURL, request };
}
