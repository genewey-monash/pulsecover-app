import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { kv, secret } from './storage';

// On the web the app is served by the same server as the API, so it talks to its own origin.
const WEB_ORIGIN: string | undefined = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
const DEFAULT_URL: string = WEB_ORIGIN
  || (process.env.EXPO_PUBLIC_API_URL as string | undefined)
  || ((Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl)
  || 'https://pulsecover-website.onrender.com';

let baseUrl = DEFAULT_URL;
let token: string | null = null;
let langGetter: () => string = () => 'en';
let onUnauthorized: (() => void) | null = null;

export const setLangGetter = (fn: () => string) => { langGetter = fn; };
export const setOnUnauthorized = (fn: (() => void) | null) => { onUnauthorized = fn; };
export const getBaseUrl = () => baseUrl;
export const getDefaultUrl = () => DEFAULT_URL;
export const getToken = () => token;

export async function loadApiConfig() {
  const saved = await kv.get('pc_server');
  if (saved) baseUrl = normalise(saved);
  token = await secret.get('pc_token');
}
export function normalise(url: string) {
  let u = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u;
}
export async function setBaseUrl(url: string | null) {
  if (!url) { baseUrl = DEFAULT_URL; await kv.del('pc_server'); return; }
  baseUrl = normalise(url); await kv.set('pc_server', baseUrl);
}
export async function setToken(t: string | null) {
  token = t;
  if (t) await secret.set('pc_token', t); else await secret.del('pc_token');
}

export class ApiError extends Error {
  status: number; network: boolean;
  constructor(message: string, status = 0, network = false) { super(message); this.status = status; this.network = network; }
}

/** GET when body is undefined, POST otherwise. Same endpoints as the website. */
export async function api<T = any>(path: string, body?: unknown, opts: { timeout?: number; silent401?: boolean } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? 30000); // free hosting can take ~30s to wake up
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Client': 'pulsecover-app', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${baseUrl}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify({ lang: langGetter(), ...(body as object) }),
      signal: ctrl.signal,
    });
    let json: any = {};
    try { json = await res.json(); } catch { /* empty or non-JSON body */ }
    if (!res.ok) {
      if (res.status === 401 && token && !opts.silent401 && onUnauthorized) onUnauthorized();
      throw new ApiError(json?.error || `Request failed (${res.status})`, res.status);
    }
    return json as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(aborted ? 'The server took too long to answer. Please try again.' : 'Cannot reach the server. Check your internet connection and try again.', 0, true);
  } finally { clearTimeout(timer); }
}
