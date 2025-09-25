/**
 * Application Configuration
 * Centralized configuration for app metadata
 */

// Import version and metadata from package.json
import packageJson from '../../package.json';

export const appConfig = {
  name: 'UCLEAN',
  version: packageJson.version,
  description: packageJson.description,
  author: packageJson.author,
  website: {
    url: 'https://ucleanlaundry.com',
    displayUrl: 'www.ucleanlaundry.com'
  },
  app: {
    title: 'UCLEAN Invoice System',
    shortTitle: 'Invoice System'
  }
} as const;

export default appConfig;