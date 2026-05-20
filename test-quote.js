const crypto = require('crypto');
require('dotenv/config');

const BASE_URL = process.env.QM_BASE_URL;
const COMPANY_KEY = process.env.QM_COMPANY_KEY;
const SECRET_KEY = process.env.QM_SECRET_KEY;
const USER_OAUTH_TOKEN = '20d40dae0a2b414ac01628d2fef75d08c3dee26cea63bc28f2ed7d3d47a43395';

async function run() {
  // Step 1: Get Access Token
  console.log('--- Step 1: Getting Access Token ---\n');

  const timestamp = Date.now();
  const hashInput = COMPANY_KEY + USER_OAUTH_TOKEN + SECRET_KEY + timestamp;
  const hashKey = crypto.createHash('sha256').update(hashInput).digest('hex');

  const authRes = await fetch(`${BASE_URL}/api/TPU/Authorize/GetAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyKey: COMPANY_KEY,
      UserOAuthToken: USER_OAUTH_TOKEN,
      HashKey: hashKey,
      Timestamp: timestamp
    })
  });

  const authData = await authRes.json();

  if (!authData.Response || !authData.Response.AccessToken || !authData.Response.AccessToken.Token) {
    console.log('Auth failed:', JSON.stringify(authData, null, 2));
    return;
  }

  const accessToken = authData.Response.AccessToken.Token;
  console.log('Access Token received!\n');

  // Step 2: Create a test quote
  console.log('--- Step 2: Creating Test Quote ---\n');
  console.log('Client: Test Client, Male, 35, Non-smoker, $100k Trauma cover\n');

  const quoteRes = await fetch(`${BASE_URL}/api/Quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      AppId: 0,
      PeopleEntity: [{
        OccupationId: { Name: "Class 1", Value: 1 },
        EmployedStatus: { Name: "Employed", Value: 1 },
        Gender: 1,
        Smoker: false,
        BenefitList: [{
          BenefitId: 4,
          QuoteOption: {
            Indexed: true,
            IsLevel: false,
            Frequency: 1,
            Factor: 0,
            LifeBuyBack: false,
            TraumaBuyBack: false,
            InstantTraumaBuyback: false,
            TpdAddOn: false,
            TpdOwnOccupation: true,
            TpdAnyOccupation: false,
            ChildTrauma: false,
            ChildCoverAmount: 0,
            Standalone: true,
            Accelerated: false,
            LifeCoverAmount: 0,
            CalcPeriod: { Name: "Yearly Renewable", Value: 1 },
            IsSeriousTrauma: false,
            SeriousTraumaCoverAmount: 0,
            Loading: { Name: "0%", Value: 1 },
            CoverAmount: 100000
          }
        }],
        FirstName: "Test",
        LastName: "Client",
        ClientId: 0,
        Age: 35,
        DateOfBirth: "1991-01-01"
      }],
      NoExtraData: true
    })
  });

  const quoteData = await quoteRes.json();

  if (quoteData.Response && quoteData.Response.AppId) {
    console.log('========================================');
    console.log('QUOTE CREATED!');
    console.log('========================================\n');
    console.log('Quote ID:', quoteData.Response.AppId);
    console.log('Crunch Time:', quoteData.Response.CrunchTime);

    const results = quoteData.Response.QuoteResultList;
    if (results && results.length > 0) {
      console.log(`\n${results.length} insurers returned:\n`);
      results.forEach((result, i) => {
        if (result.Provider) {
          const p = result.Provider;
          console.log(`  ${i + 1}. ${p.ProviderName || 'Unknown'} — $${p.TotalPremium?.toFixed(2) || 'N/A'}/yr | QPR: ${p.QprRating || 'N/A'}`);
        }
      });
      console.log('\n========================================');
      console.log('THE API WORKS. Send that contract.');
      console.log('========================================\n');
    } else {
      console.log('\nNo results in QuoteResultList. Checking BankQuoteResultList...\n');
      const bankResults = quoteData.Response.BankQuoteResultList;
      if (bankResults && bankResults.length > 0) {
        bankResults.forEach((result, i) => {
          if (result.Provider) {
            const p = result.Provider;
            console.log(`  ${i + 1}. ${p.ProviderName || 'Unknown'} — $${p.TotalPremium?.toFixed(2) || 'N/A'}/yr | QPR: ${p.QprRating || 'N/A'}`);
          }
          // Check if there are products with premiums in the results
          if (result.Result) {
            result.Result.forEach(client => {
              if (client.BenefitList) {
                client.BenefitList.forEach(benefit => {
                  if (benefit.ProductEntityList) {
                    benefit.ProductEntityList.forEach(product => {
                      if (product.Premium > 0) {
                        console.log(`  Product: ${product.ProductName} — $${product.Premium.toFixed(2)}/yr`);
                      }
                    });
                  }
                });
              }
            });
          }
        });
        if (bankResults.some(r => r.Provider)) {
          console.log('\n========================================');
          console.log('GOT RESULTS FROM BANK LIST. API WORKS.');
          console.log('========================================\n');
        } else {
          console.log('BankQuoteResultList exists but no provider data. May need Research enabled.\n');
          console.log('Full first bank result:');
          console.log(JSON.stringify(bankResults[0], null, 2).substring(0, 3000));
        }
      } else {
        console.log('No results at all. Response:');
        console.log(JSON.stringify(quoteData, null, 2).substring(0, 3000));
      }
    }
  } else {
    console.log('Quote response:', JSON.stringify(quoteData, null, 2).substring(0, 3000));
  }
}

run().catch(e => console.log('Error:', e.message));
