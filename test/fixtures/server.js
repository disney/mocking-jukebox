import { promises as fs } from 'fs';
import { join } from 'path';
import { cwd, env } from 'process';

import express from 'express';

// import { mockServiceWorkerRouteHandler, proxyRouteHandler } from 'mocking-jukebox';
import mockingJukebox from '../../dist/server.cjs';

const { readFile } = fs;


/**
 * Create a simple web server to serve the static index.html and provide endpoints for the time request and for mocking
 */
function init() {
	const server = express();
	const port = env.FIXTURE_SERVER_PORT || 4000;

	server.use(express.json()); // Support parsing JSON request bodies

	const indexHtmlPath = join(cwd(), 'test', 'fixtures', 'index.html');
	const clientJsPath = join(cwd(), 'test', 'fixtures', 'client.js');
	const mockingJukeboxJsPath = join(cwd(), 'dist', 'client.js');
	const mockingJukeboxSourceMapPath = join(cwd(), 'dist', 'client.js.map');

	const serveStaticAsset = async (res, filePath, contentType) => {
		// We deliberately don’t cache the static assets so that the server doesn’t need to restart when running the Mocking Jukebox build in watch mode
		const source = await readFile(filePath, 'utf-8');

		res.statusCode = 200;
		res.setHeader('content-type', contentType);
		res.send(source);
	}

	server.get('/', async (req, res) => {
		await serveStaticAsset(res, indexHtmlPath, 'text/html');
	});

	server.get('/client.js', async (req, res) => {
		await serveStaticAsset(res, clientJsPath, 'text/javascript');
	});

	server.get('/mocking-jukebox.js', async (req, res) => {
		await serveStaticAsset(res, mockingJukeboxJsPath, 'text/javascript');
	});

	server.get('/client.js.map', async (req, res) => {
		await serveStaticAsset(res, mockingJukeboxSourceMapPath, 'text/javascript');
	});

	server.get('/timestamp', (req, res) => {
		res.statusCode = 200;
		res.setHeader('content-type', 'text/html');
		res.end(`${Date.now()}`, 'utf-8');
	});

	server.get('/mockServiceWorker.js', mockingJukebox.mockServiceWorkerRouteHandler);

	server.post('/mock', mockingJukebox.proxyRouteHandler);

	server.listen(port, () => {
		console.log(`Server listening at http://localhost:${port}`);
	});
}

init();
