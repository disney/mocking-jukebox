import { getResponse } from './get-response';
import { MockingMode } from '../../shared/enums';

import type { Request, Response } from 'express';
import type { RequestInit } from 'node-fetch';
import { RouteMatch } from '../../shared/types';


/**
 * Handler for the endpoint that the frontend will call to retrieve mock responses for intercepted network requests.
 *
 * Usage:
 * ```js
 * import { proxyRouteHandler } from 'mocking-jukebox';
 * import express from 'express';
 * const app = express();
 * app.use(express.json());
 * app.post('/mock', proxyRouteHandler);
 * ```
 *
 * @returns Express (or generic Node http server) route handler function
 */
export async function proxyRouteHandler(req: Request, res: Response): Promise<void> {
	const album: string = req.body.album;
	const fetchOptions: RequestInit = req.body.request;
	const match: RouteMatch = req.body.match;
	const mockingMode = (req.body.mockingMode as MockingMode);
	const { url }: { url: string } = req.body.request;

	// Get either the recording (if one already existed) or the just-received response
	const output = await getResponse({album, fetchOptions, match, mockingMode, url});

	// Exclude headers that will be set automatically
	delete output.headers['content-encoding'];
	delete output.headers['content-length'];
	delete output.headers['transfer-encoding'];

	// Add a header to aid in debugging
	output.headers['x-mocking-jukebox-source'] = output.source;

	// Avoid CORS errors when the site is running through a proxy
	output.headers['access-control-allow-origin'] = '*';

	// Respond with mock
	res.set(output.headers);
	res.status(output.status);
	res.send(output.body);
	res.end();
}
