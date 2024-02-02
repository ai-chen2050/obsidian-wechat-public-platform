import { Cookie } from 'set-cookie-parser';
import * as crypto from "crypto";
import 'jimp';
const { Jimp } = window as any;

export const parseCookies = (cookieInput: string): Cookie[] => {
	if (cookieInput === '') {
		return [];
	}

	const pairs = cookieInput.split(';');
	const splittedPairs = pairs.map((cookie) => cookie.split('='));
	const cookieArr: Cookie[] = splittedPairs.map((pair) => {
		return {
			name: decodeURIComponent(pair[0].trim()),
			value: decodeURIComponent(pair[1].trim())
		};
	});
	return cookieArr;
};

export const getCookieString = (cookies: Cookie[]): string => {
	return cookies
		.map((cookie) => {
			const key = cookie.name;
			const value = cookie.value;
			const decodeValue = value.indexOf('%') !== -1 ? decodeURIComponent(value) : value;
			return key + '=' + decodeValue;
		})
		.join(';');
};

export const generateRandomString = (length: number): string => {
	const characters = 'ijklmnopqrstuvabcdefghijklmnopqrstuvwxyz123456789';
	let randomString = '';
  
	for (let i = 0; i < length; i++) {
	  const randomIndex = Math.floor(Math.random() * characters.length);
	  randomString += characters.charAt(randomIndex);
	}
  
	return randomString;
}

export const chooseBoundary = (): string => {
  const boundary = crypto.randomBytes(16).toString("hex");
  return boundary;
}

export const jsonToUrlEncoded = (json: Record<string, string>): string => {
	const params = new URLSearchParams();
  
	for (const key in json) {
	  if (Object.prototype.hasOwnProperty.call(json, key)) {
		params.append(key, json[key]);
	  }
	}
  
	return params.toString();
}

export const isWebp = (buffer: Uint8Array) => {
	if (!buffer || buffer.length < 12) {
		return false;
	}

	return buffer[8] === 87
		&& buffer[9] === 69
		&& buffer[10] === 66
		&& buffer[11] === 80;
}

export async function convertToPngBuffer(buffer: Buffer): Promise<Buffer> {
	try {		
		const image = await Jimp.read(buffer);
		return await image.getBufferAsync(Jimp.MIME_PNG);
	} catch (err) {
	  	throw err;
	}
}