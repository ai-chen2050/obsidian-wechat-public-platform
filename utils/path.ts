import { TFile } from 'obsidian';

export function getAllRecursiveFolders(filePaths: TFile[]): string[] {
	const foldersSet: Set<string> = new Set();
	
	for (const filePath of filePaths) {
	  const folders = filePath.path.split('/');
	  folders.pop(); // Remove the filename from the path
	  
	  // Iterate over each folder in the path and add it to the set
	  for (let i = 1; i <= folders.length; i++) {
		const folderPath = folders.slice(0, i).join('/');
		foldersSet.add(folderPath);
	  }
	}
	
	// Convert the set to an array and return
	return Array.from(foldersSet);
}

export function splitPathAndFile(filePath: string): [string, string] {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
        const path = filePath.substring(0, lastSlashIndex);
        const file = filePath.substring(lastSlashIndex + 1);
        return [path, file];
    } else {
        return [filePath, ''];
    }
}