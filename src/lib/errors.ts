import { ApiError } from './api';

/** Turns server/network errors into the visitor's language. Unknown messages fall back to the server text. */
export function errorText(e: unknown, t: (k: string) => string): string {
  if (e instanceof ApiError) {
    if (e.network) return e.status === 0 && /too long/i.test(e.message) ? t('app.err.timeout') : t('app.err.network');
    const m = e.message;
    if (/no account found/i.test(m)) return t('acc.err.noacct');
    if (/incorrect/i.test(m)) return t('acc.err.login');
    if (/already exists/i.test(m)) return t('acc.err.exists');
    if (/invalid email/i.test(m)) return t('acc.err.email');
    if (/do not match/i.test(m)) return t('acc.err.match');
    if (/at least 16/i.test(m)) return t('acc.err.dob');
    if (/at least 8/i.test(m)) return t('acc.err.pwlen');
    if (/too many/i.test(m)) return t('cb.err.many');
    if (/invalid phone/i.test(m)) return t('pf.err.phone');
    if (/log in first/i.test(m)) return t('connect.login');
    if (e.status >= 500) return t('common.error');
    return m;
  }
  return t('common.error');
}
