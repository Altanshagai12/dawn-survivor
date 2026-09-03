import { SKIN_STORE_CATALOG } from '../src/data/skinProducts.js?build=20260903d';

// Review/register this document through the Usions service-owner catalog API.
// This command never reads credentials, makes requests, or changes a wallet.
process.stdout.write(`${JSON.stringify(SKIN_STORE_CATALOG, null, 2)}\n`);
