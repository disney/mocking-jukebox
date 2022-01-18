#!/usr/bin/env node

// Based on https://esbuild.github.io/getting-started/#build-scripts
// Assumes modern Node.js

// Usage:
// ./build.js          # Build client and server code
// ./build.js --watch  # Build, watch for changes and rebuild, and lint
// ./build.js --serve  # Build, watch and also serve the fixture in test/fixtures/server.js (implies --watch)

import { fork } from 'child_process';
import { watch, promises as fs } from 'fs';
import { join } from 'path';
import { argv, cwd, exit } from 'process';

import esbuild from 'esbuild';
import { ESLint } from 'eslint';

const { readFile } = fs;


const options = {
	serve: argv.includes('--serve'),
};
options.watch = options.serve || argv.includes('--watch');
options.lint = options.watch;

const entryPoints = {
	client: 'src/client/index.ts',
	server: 'src/server/index.ts',
};


let eslint, eslintFormatter, eslintOptions, eslintFiles, tscPath, tsFiles;
if (options.lint) {
	eslint = new ESLint();
	eslintFormatter = await eslint.loadFormatter('stylish');
	eslintOptions = JSON.parse(await readFile(join(cwd(), '.eslintrc.json')));
	eslintFiles = {
		buildClient: eslintOptions.overrides.find(el => el.env.browser).files,
		buildServer: eslintOptions.overrides.find(el => el.env.node).files,
		build: eslintOptions.overrides.flatMap(el => el.files)
	};

	tscPath = join(cwd(), 'node_modules', '.bin', 'tsc');
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	tsFiles = { // TODO: Run tsc only on subset of files that just changed
		buildClient: [entryPoints.client],
		buildServer: [entryPoints.server],
		build: [entryPoints.client, entryPoints.server],
	};
}

let serverProcess;
const serverPath = join(cwd(), 'test', 'fixtures', 'server.js');


function buildClient() {
	return esbuild.build({
		bundle: true,
		define: {
			'process.env.NODE_ENV': "'production'" // msw/lib/esm/graphql.js references process.env.NODE_ENV
		},
		entryPoints: [entryPoints.client],
		format: 'esm',
		outfile: 'dist/client.js',
		sourcemap: true,
		target: ['es2020'],
	})
}

function buildServer() {
	return esbuild.build({
		bundle: true,
		entryPoints: [entryPoints.server],
		external: [
			'express',
			'js-yaml',
			'msw',
			'msw/lib/esm/mockServiceWorker.js',
			'node-fetch',
		],
		outfile: 'dist/server.cjs',
		platform: 'node',
		sourcemap: true,
		target: ['node14'],
	});
}

function build() {
	return Promise.all([
		buildClient(),
		buildServer()
	]);
}

let debounce = false;
async function wrapBuildFunction(message, fn) {
	if (debounce) {
		return;
	}
	debounce = setTimeout(() => {
		debounce = false;
	}, 50);

	console.clear();
	console.log(message);
	try {
		await fn();
	} catch (exception) {
		console.error(exception);
		if (!options.watch) {
			exit(1);
		}
	}

	if (options.serve) {
		serve();
	}

	if (options.lint) {
		lint(fn);
	}
}

async function lint(fn) {
	// https://eslint.org/docs/developer-guide/nodejs-api#eslint-class
	try {
		const lintResults = await eslint.lintFiles(eslintFiles[fn.name]);
		console.log(eslintFormatter.format(lintResults));
	} catch (exception) {
		console.error(exception);
	}

	// TODO: Lint only the files that just changed
	fork(tscPath, ['--noEmit']);
}

function serve() {
	if (serverProcess) {
		console.log('Restarting server...');
		serverProcess.kill();
	} else {
		console.log('Starting server...');
	}
	serverProcess = fork(serverPath)
}

if (options.watch) {
	watch('src/client', { recursive: true }, async () => {
		await wrapBuildFunction('Rebuilding client...', buildClient);
	});
	watch('src/server', { recursive: true }, async () => {
		await wrapBuildFunction('Rebuilding server...', buildServer);
	});
	watch('src/shared', { recursive: true }, async () => {
		await wrapBuildFunction('Rebuilding client and server...', build);
	});
	if (options.serve) {
		watch(serverPath, serve);
	}
}

wrapBuildFunction('Building client and server...', build);
