import { promises as fs } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

const { readdir, rmdir } = fs;


export async function cleanupRecordings(): Promise<void> {
	const folders = await readdir(join(cwd(), 'mock-recordings', 'recordings'));
	for (const folder of folders) {
		if (/^cypress\d{13}$/.test(folder)) {
			await rmdir(join(cwd(), 'mock-recordings', 'recordings', folder), { recursive: true });
		}
	}
	return null;
}
