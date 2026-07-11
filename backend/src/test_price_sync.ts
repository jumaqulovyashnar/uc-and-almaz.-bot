import { syncPackagePrices } from './services/priceSync.service.js';

console.log('=== PRICE SYNCHRONIZATION TEST START ===');

syncPackagePrices()
  .then((result) => {
    console.log('=== TEST RESULT ===');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error('=== TEST ERROR ===');
    console.error(err);
  });
