import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd, env } from 'node:process';

import express from 'express';
import { registerExpressAPI } from '@pollyjs/node-server';



const server = express();
const port = env.FIXTURE_SERVER_PORT || 3000;

registerExpressAPI(server);

server.use(express.json()); // Support parsing JSON request bodies


const serveStaticAsset = async (res, filePath, contentType) => {
	// We deliberately don’t cache the static assets so that the server doesn’t need to restart when running in watch mode
	const source = await readFile(filePath, 'utf-8');

	res.statusCode = 200;
	res.setHeader('content-type', contentType);
	res.send(source);
}


server.get('/', async (req, res) => {
	await serveStaticAsset(res, join(cwd(), 'index.html'), 'text/html');
});

[
	'/client.js',
	'/node_modules/@pollyjs/core/dist/umd/pollyjs-core.js',
	'/node_modules/@pollyjs/adapter-fetch/dist/umd/pollyjs-adapter-fetch.js',
	'/node_modules/@pollyjs/persister-rest/dist/umd/pollyjs-persister-rest.js',
].forEach(filePath => {
	server.get(filePath, async (req, res) => {
		await serveStaticAsset(res, join(cwd(), filePath), 'text/javascript');
	});
});

[
	'/node_modules/@pollyjs/core/dist/umd/pollyjs-core.js.map',
	'/node_modules/@pollyjs/adapter-fetch/dist/umd/pollyjs-adapter-fetch.js.map',
	'/node_modules/@pollyjs/persister-rest/dist/umd/pollyjs-persister-rest.js.map',
].forEach(filePath => {
	server.get(filePath, async (req, res) => {
		await serveStaticAsset(res, join(cwd(), filePath), 'application/json');
	});
});


server.get('/timestamp', (req, res) => {
	res.statusCode = 200;
	res.setHeader('content-type', 'text/html');
	res.end(`${Date.now()}`, 'utf-8');
});


server.listen(port, () => {
	console.log(`Server listening at http://localhost:${port}`);
});
