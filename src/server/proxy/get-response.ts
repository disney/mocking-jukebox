import { createHash } from 'crypto';
import { join } from 'path';
import { cwd } from 'process';

import { MockingMode } from '../../shared/enums';
import { getExistingRecording } from './playback';
import { getNewRecording } from './recording';

import type { RequestInit } from 'node-fetch';
import type { GetResponseOutput } from './types';
import type { RouteMatch } from '../../shared/types';


/**
 * Create a hash to use as the filename of a recording of this particular network request.
 *
 * @param fetchOptions - The parameters to pass to `fetch` that define the network request.
 * @param match - Configuration for determining whether or how to match the intercepted request with a saved recording.
 * @returns The hash.
 */
const getMatchHash = (fetchOptions: RequestInit, match: RouteMatch = {}): string => {
	const matchObj: {
		body?: typeof match.body; // Body contents that we’re matching on
		headers?: Record<string, string>; // Cannot be an array of header keys; must include values
	} = {};

	if (match.body) {
		matchObj.body = match.body;
	}

	if (match.headers) {
		// If the route configuration specified just a list of header keys to match, use the header key:value pairs for the purposes of the hash
		if (Array.isArray(match.headers)) {
			matchObj.headers = {};
			match.headers.forEach(headerKey => {
				(matchObj.headers as Record<string, string>)[headerKey] = fetchOptions.headers?.[headerKey as keyof HeadersInit] as string;
			})
		} else { // Header keys and values
			matchObj.headers = match.headers;
		}
	}

	return createHash('md5').update(JSON.stringify(matchObj)).digest('hex');
};


/**
 * For a given intercepted network request, get a response to return to the client. The response may come from an already-saved recording, or from a new network request that we will return and save for future playback.
 *
 * @param url - The URL of the intercepted network request.
 * @param fetchOptions - The parameters to pass to `fetch` that define the network request.
 * @param match - Configuration for determining whether or how to match the intercepted request with a saved recording.
 * @param mockingMode - Whether we should be making new recordings or returning previously-saved ones.
 * @returns The response to send to the client.
 */
export const getResponse = async ({
	album,
	fetchOptions,
	match = {},
	mockingMode,
	url
}: {
	album: string;
	fetchOptions: RequestInit;
	match: RouteMatch;
	mockingMode: MockingMode
	url: string;
}): Promise<GetResponseOutput> => {
	const matchHash = getMatchHash(fetchOptions, match);
	const { hostname, pathname } = new URL(url);
	const filePath = join(cwd(), 'mock-recordings', 'recordings', album, hostname, encodeURIComponent(pathname.slice(1)), (fetchOptions.method as string).toLowerCase(), `${matchHash}.yaml`);

	if (mockingMode === MockingMode.Playback) {
		// In playback mode, return a recording if it exists, else return an error response
		return getExistingRecording(url, filePath);
	} else if (mockingMode === MockingMode.Recording) {
		// In recording mode, proxy the original request and save/overwrite a recording for it
		return getNewRecording(url, fetchOptions, filePath);
	} else {
		throw new Error('Mocking mode must be playback or recording');
	}
};
