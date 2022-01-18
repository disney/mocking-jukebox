import { dirname, join } from 'path';
import { cwd } from 'process';
import { promises as fs } from 'fs';
const { writeFile, mkdir, stat } = fs;

import fetch from 'node-fetch';
import { dump } from 'js-yaml';

import { HttpMethod } from '../../shared/enums';

import type { RequestInit, Response as FetchResponse } from 'node-fetch';
import type { Recording, GetResponseOutput } from './types';
import { IncomingHttpHeaders } from 'http';


// Exclude secrets from recordings headers
const recordingHeadersDenyList = {
	request: new Set([
		'authorization',
		'cookie'
	]),
	response: new Set([
		// None yet
	])
};


/**
 * For a given network request, make the actual network request and save both the request and response as a new recording; then return the response.
 *
 * @param url - The URL of the intercepted network request.
 * @param fetchOptions - The parameters to pass to `fetch` that define the network request.
 * @param filePath - The path to the file of the recording for a previously intercepted copy of this network request.
 * @returns The response to send to the client.
 */
export const getNewRecording =
async (url: string, fetchOptions: RequestInit, filePath: string): Promise<GetResponseOutput> => {
	// Prepare the request
	if (typeof fetchOptions.body !== 'string') {
		fetchOptions.body = JSON.stringify(fetchOptions.body);
	}

	// Make the request
	let fetchResponse: FetchResponse;

	try {
		fetchResponse = await fetch(url, fetchOptions);
	} catch (exception) {
		console.error(`[mocking] Error fetching ${url} with options:`, fetchOptions, exception);

		return {
			body: `Error fetching ${url}`,
			headers: {},
			source: '<error fetching url>',
			status: 500
		};
	}
	console.log(`[mocking] Proxy request for ${fetchOptions.method} ${url} returned status ${fetchResponse.status}`);

	// Parse response
	const fetchResponseHeaders = Object.fromEntries(fetchResponse.headers);
	const fetchResponseBodyText = await fetchResponse.text();
	let fetchResponseBody: string | null;

	// For JSON, convert into pretty formatted JSON so that recordings are easier to diff
	if (fetchResponseHeaders['content-type'] === 'application/json' && fetchResponseBodyText && fetchResponseBodyText !== '') {
		try {
			fetchResponseBody = JSON.stringify(JSON.parse(fetchResponseBodyText), null, 2);
		} catch (exception) {
			console.error(`[mocking] Error parsing JSON from ${url}:`, fetchResponseBodyText, exception);
			fetchResponseBody = fetchResponseBodyText;
		}
	} else {
		fetchResponseBody = fetchResponseBodyText;
	}

	// Prepare the recording
	let fetchOptionsBody = fetchOptions.body || null;

	if (fetchOptionsBody && fetchOptionsBody !== '' && (fetchOptions.headers?.['content-type' as keyof HeadersInit] as string)?.startsWith('application/json')) {
		// Covert request body into pretty formatted JSON so that our recordings are easier to diff
		try {
			fetchOptionsBody = JSON.stringify(JSON.parse(fetchOptionsBody), null, 2);
		} catch {
			// If attempt at pretty formatting fails, just use original fetchOptionsBody
		}
	}

	// Assemble recording document
	const recording: Recording = {
		request: {
			body: fetchOptionsBody,
			headers: fetchOptions.headers as IncomingHttpHeaders,
			method: fetchOptions.method as HttpMethod,
			url
		},
		response: {
			body: fetchResponseBody,
			headers: fetchResponseHeaders,
			status: fetchResponse.status,
			statusText: fetchResponse.statusText,
			url: fetchResponse.url
		}
	};

	['request', 'response'].forEach(((message: keyof typeof recordingHeadersDenyList) => {
		recordingHeadersDenyList[message].forEach((header: string) => {
			delete recording[message].headers[header];
		});
	}) as (value: string) => void);

	// Save recording, but only if we’re in a local git checkout (and definitely not in production)
	let inGitCheckout = false;

	try {
		inGitCheckout = !!(await stat(join(cwd(), '.git')));
	} catch {
		// No .git folder found; inGitCheckout is still false
	}
	if (inGitCheckout && process.env.NODE_ENV !== 'production') {
		try {
			await mkdir(dirname(filePath), { recursive: true });
			// Save recording as YAML so that our pretty-formatted JSON bodies are saved multiline for easier diffing
			await writeFile(filePath, dump(recording, { sortKeys: true }), 'utf8');
		} catch (exception) {
			console.error(`[mocking] Error saving ${filePath}\n`, exception);
		}
	}

	return {
		body: recording.response.body,
		headers: recording.response.headers,
		source: url,
		status: recording.response.status
	};
};
