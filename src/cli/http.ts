import fetch, { HeadersInit } from "node-fetch";

export type RequestOptions = {
	url: string;
	method?: string;
	headers?: HeadersInit;
	body?: any;
};

export type JsonResponse = {
	status: number;
	headers: Record<string, string>;
	text: string;
	json: any;
};

export type BinaryResponse = {
	status: number;
	headers: Record<string, string>;
	arrayBuffer: ArrayBuffer;
};

const normalizeHeaders = (headers: any): Record<string, string> => {
	const out: Record<string, string> = {};
	headers.forEach((value: string, key: string) => {
		out[key.toLowerCase()] = value;
	});
	return out;
};

export const requestJson = async (
	options: RequestOptions,
): Promise<JsonResponse> => {
	const res = await fetch(options.url, {
		method: options.method ?? "GET",
		headers: options.headers,
		body: options.body,
	});
	const text = await res.text();
	let json: any = {};
	if (text) {
		try {
			json = JSON.parse(text);
		} catch {
			json = {};
		}
	}
	return {
		status: res.status,
		headers: normalizeHeaders(res.headers),
		text,
		json,
	};
};

export const requestBinary = async (
	options: RequestOptions,
): Promise<BinaryResponse> => {
	const res = await fetch(options.url, {
		method: options.method ?? "GET",
		headers: options.headers,
		body: options.body,
	});
	const arrayBuffer = await res.arrayBuffer();
	return {
		status: res.status,
		headers: normalizeHeaders(res.headers),
		arrayBuffer,
	};
};
