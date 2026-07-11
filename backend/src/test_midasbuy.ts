import { runMidasbuyAutomation } from './services/automation.service.js';

console.log('=== MIDASBUY AUTOMATION TEST START ===');

// Check for command line arguments: --id <playerId> --pkg <packageName>
const args = process.argv.slice(2);
const idIndex = args.indexOf('--id');
const pkgIndex = args.indexOf('--pkg');

const playerId = idIndex !== -1 && args[idIndex + 1] ? args[idIndex + 1] : '5123456789';
const packageName = pkgIndex !== -1 && args[pkgIndex + 1] ? args[pkgIndex + 1] : '60 UC';

console.log(`Test Parameters:\n- Player ID: ${playerId}\n- Package: ${packageName}`);

runMidasbuyAutomation(playerId, packageName)
  .then((result) => {
    console.log('=== TEST RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error('=== TEST ERROR ===');
    console.error(err);
  });
