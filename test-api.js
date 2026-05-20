const crypto = require('crypto');
require('dotenv/config');

const BASE_URL = process.env.QM_BASE_URL;
const COMPANY_KEY = process.env.QM_COMPANY_KEY;
const SECRET_KEY = process.env.QM_SECRET_KEY;

// Step 1: Try getting the access token using the direct user auth endpoint
async function testDirectAuth() {
  console.log('\n--- Testing Direct API Auth ---\n');

  // Try the standard user authorize endpoint first
  const url = `${BASE_URL}/api/User/Authorize`;

  console.log('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      UserName: 'benji@mccarthys.nz',
      Password: process.argv[2] || '' // Pass password as argument
    })
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2).substring(0, 2000));

  if (data.access_token || data.Token || (data.Response && data.Response.AccessToken)) {
    const token = data.access_token || data.Token || data.Response.AccessToken.Token;
    console.log('\nGot token! Testing quote...\n');
    await createTestQuote(token);
  } else {
    console.log('\nDirect auth response above. Trying alternate endpoint...\n');
    await testGetAccess();
  }
}

// Try the GetAccess endpoint
async function testGetAccess() {
  const url = `${BASE_URL}/api/User/Authorize/GetAccess`;

  console.log('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      UserName: 'benji@mccarthys.nz',
      Password: process.argv[2] || ''
    })
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2).substring(0, 2000));

  // Try to extract token from various possible response shapes
  let token = null;
  if (data.access_token) token = data.access_token;
  else if (data.Token) token = data.Token;
  else if (data.Response && data.Response.Token) token = data.Response.Token;
  else if (data.Response && data.Response.AccessToken) token = data.Response.AccessToken.Token || data.Response.AccessToken;
  else if (typeof data === 'string') token = data;

  if (token) {
    console.log('\nGot token! Testing quote...\n');
    await createTestQuote(token);
  } else {
    console.log('\nCould not extract token. Trying swagger auth endpoint...\n');
    await testSwaggerAuth();
  }
}

// Try the swagger/token endpoint
async function testSwaggerAuth() {
  const url = `${BASE_URL}/api/Token`;

  console.log('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=password&username=benji@mccarthys.nz&password=${encodeURIComponent(process.argv[2] || '')}`
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.substring(0, 2000));

  try {
    const data = JSON.parse(text);
    if (data.access_token) {
      console.log('\nGot token! Testing quote...\n');
      await createTestQuote(data.access_token);
    }
  } catch(e) {
    console.log('\nAll direct auth methods tried. Output above shows what the API expects.');
    console.log('\nWe may need the OAuth token from the callback. Let me try a public endpoint...\n');
    await testPublicEndpoint();
  }
}

// Test a public endpoint to confirm API is reachable
async function testPublicEndpoint() {
  console.log('--- Testing public endpoint ---');

  // Try listing providers (might not need auth)
  const endpoints = [
    '/api/Quote/Providers',
    '/api/LegacyQpr/Companies',
    '/api/LegacyQpr/ProductLines',
  ];

  for (const ep of endpoints) {
    const url = `${BASE_URL}${ep}`;
    console.log('\nGET', url);
    try {
      const res = await fetch(url);
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response:', text.substring(0, 500));
    } catch(e) {
      console.log('Error:', e.message);
    }
  }
}

// Create a test quote
async function createTestQuote(accessToken) {
  console.log('--- Creating Test Quote ---\n');

  const url = `${BASE_URL}/api/Quote`;
  const body = {
    AppId: 0,
    PeopleEntity: [
      {
        OccupationId: { Name: "Class 1", Value: 1 },
        EmployedStatus: { Name: "Employed", Value: 1 },
        Gender: 1,
        Smoker: false,
        BenefitList: [
          {
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
          }
        ],
        FirstName: "Test",
        LastName: "Client",
        ClientId: 0,
        Age: 35,
        DateOfBirth: "1991-01-01"
      }
    ],
    NoExtraData: true
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (data.Response && data.Response.AppId) {
    console.log('========================================');
    console.log('QUOTE CREATED SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('Quote ID:', data.Response.AppId);
    console.log('Crunch Time:', data.Response.CrunchTime);

    const results = data.Response.QuoteResultList;
    if (results && results.length > 0) {
      console.log(`\nGot ${results.length} provider results!\n`);
      results.forEach((result, i) => {
        if (result.Provider) {
          const p = result.Provider;
          console.log(`${i + 1}. ${p.ProviderName} — $${p.TotalPremium?.toFixed(2) || 'N/A'}/yr | QPR: ${p.QprRating || 'N/A'}`);
        }
      });
      console.log('\n========================================');
      console.log('IT WORKS! Send that contract.');
      console.log('========================================\n');
    }
  } else {
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 2000));
  }
}

// Check password was provided
if (!process.argv[2]) {
  console.log('Usage: node test-api.js YOUR_SANDBOX_PASSWORD');
  console.log('Example: node test-api.js MyPassword123');
  process.exit(1);
}

testDirectAuth();
