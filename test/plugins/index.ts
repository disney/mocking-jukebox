import { cleanupRecordings } from './cleanup';


export default function plugins(on: Parameters<Cypress.PluginConfig>[0]/*, config*/): void {
	on('task', {
		cleanupRecordings,
	});
}
