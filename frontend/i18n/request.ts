import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const preferenceCookie = cookieStore.get('LOCALE_PREFERENCE')?.value;
  const locale = preferenceCookie === '1' ? (localeCookie ?? 'en') : 'en';
  const validLocales = ['en', 'tr'];
  const resolvedLocale = validLocales.includes(locale) ? locale : 'en';

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
