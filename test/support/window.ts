// Type the items added to `window` by test/fixtures/client.js

import type { MockingJukebox } from '../../src/client/index';
import type { EnableMockingOptions, Route } from '../../src/client/types';


declare global {
  interface Window {
    initializeMocking: (method: string, mockingOptions: EnableMockingOptions) => Promise<void>;
    mockingJukebox: typeof MockingJukebox;
    routes: Route[];
    updateTimestamp: () => Promise<void>;
  }
}
