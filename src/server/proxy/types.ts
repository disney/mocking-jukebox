import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'; // https://stackoverflow.com/a/58975210/223225

import type { HttpMethod } from '../../shared/enums';

export interface Recording {
	request: {
		body: string | null;
		headers: IncomingHttpHeaders;
		method: HttpMethod;
		url: string;
	};
	response: {
		body: string | null;
		headers: OutgoingHttpHeaders;
		status: number;
		statusText: string;
		url: string;
	};
}

export interface GetResponseOutput {
	body: string | null;
	headers: OutgoingHttpHeaders;
	source: string;
	status: number;
}
