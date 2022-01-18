import { promises as fs } from 'fs';
const { readFile } = fs;

import { load } from 'js-yaml';

import type { Recording, GetResponseOutput } from './types';


/**
 * Load from disk and return a previous recording, or return an error response.
 *
 * @param url - The URL of the intercepted network request.
 * @param filePath - The path to the file of the recording for a previously intercepted copy of this network request.
 * @returns The response to send to the client.
 */
export const getExistingRecording = async (url: string, filePath: string): Promise<GetResponseOutput> => {
	try {
		const recordingContents = await readFile(filePath, 'utf8');
		const recording = load(recordingContents) as Recording;

		return {
			body: recording.response.body,
			headers: recording.response.headers,
			source: filePath,
			status: recording.response.status
		};
	} catch { // No recording exists for this request
		const errorMessage = `No recording available for ${url}; expected valid file at ${filePath}`;

		console.error(`[mocking] ${errorMessage}`);

		return {
			body: `{\n\t"error": "${errorMessage}"\n}`,
			headers: {},
			source: '<none found>',
			status: 404
		};
	}
};
