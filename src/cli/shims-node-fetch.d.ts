declare module "node-fetch" {
	export type HeadersInit = any;
	export interface RequestInit {
		method?: string;
		headers?: HeadersInit;
		body?: any;
	}

	export interface Response {
		status: number;
		headers: any;
		text(): Promise<string>;
		json(): Promise<any>;
		arrayBuffer(): Promise<ArrayBuffer>;
	}

	const fetch: (url: any, init?: RequestInit) => Promise<Response>;
	export default fetch;
}
