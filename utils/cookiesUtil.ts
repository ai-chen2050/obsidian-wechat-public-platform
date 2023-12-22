import { Cookie } from 'set-cookie-parser';

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
	const characters = 'ijklmnopqrstuvabcdefghijklmnopqrstuvwxyz0123456789';
	let randomString = '';
  
	for (let i = 0; i < length; i++) {
	  const randomIndex = Math.floor(Math.random() * characters.length);
	  randomString += characters.charAt(randomIndex);
	}
  
	return randomString;
  }