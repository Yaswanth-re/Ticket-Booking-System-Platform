export function getAppUrl(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Configuration Error: APP_URL environment variable is missing in production. Please set it in your environment variables.');
    }
    return 'http://localhost:3000';
  }
  return appUrl;
}
