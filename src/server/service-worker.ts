import { readFileSync } from 'fs';

import type { Request, Response } from 'express';


const mockServiceWorkerSource = readFileSync(require.resolve('msw/lib/esm/mockServiceWorker.js'));

/**
 * Serve helper file for Mock Service Worker client-side network request mocking library.
 * See https://mswjs.io/docs/getting-started/integrate/browser
 *
 * Usage:
 * ```js
 * import { mockServiceWorkerRouteHandler } from 'mocking-jukebox';
 * import express from 'express';
 * const app = express();
 * app.get('/mockServiceWorker.js', mockServiceWorkerRouteHandler);
 * ```
 *
 * @returns Express route handler function
 */
export function mockServiceWorkerRouteHandler(req: Request, res: Response): void {
	res.setHeader('content-type', 'text/javascript');
	res.send(mockServiceWorkerSource);
	res.end();
}
