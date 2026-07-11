import { runGarenaAutomation } from './services/automation.service.js';

// Siz test qilmoqchi bo'lgan Free Fire Player ID-sini shu yerga yozing
const TEST_PLAYER_ID = '123456789'; 

console.log('=== GARENA AUTOMATION TEST START ===');
console.log(`Testing with Player ID: ${TEST_PLAYER_ID}`);

runGarenaAutomation(TEST_PLAYER_ID)
  .then((result) => {
    console.log('=== TEST RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error('=== TEST ERROR ===');
    console.error(err);
  });
