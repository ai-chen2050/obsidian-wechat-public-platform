import { Cookie } from 'set-cookie-parser';
import * as crypto from "crypto";

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