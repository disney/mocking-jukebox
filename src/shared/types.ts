import { MockingMode } from './enums';


export interface MockingState {
  album?: string;
  mode: MockingMode;
}


export interface RouteMatch {
	body?: string | Record<string, unknown>;
	headers?: string[] | Record<string, string>;
}
