const express = require('express');
const crypto = require('crypto');
const http = require('http');
require('dotenv/config');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BASE_URL = process.env.QM_BASE_URL;
const COMPANY_KEY = process.env.QM_COMPANY_KEY;
const SECRET_KEY = process.env.QM_SECRET_KEY;
const PORT = 3456;
const REDIRECT_URL = `http://localhost:${PORT}/callback`;

let userOAuthToken = null;

// Step 1: Request OAuth URL from QM
async function getOAuthUrl() {
  const url = `${BASE_URL}/api/ThirdCompany/OAuth?key=${COMPANY_KEY}&redirectUrl=${encodeURIComponent(REDIRECT_URL)}`;

  console.log('\n--- Step 1: Requesting OAuth URL ---');
  console.log('POST', url);

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.Response && data.Response.MessageCode === 200) {
    const loginUrl = data.Response.ExtValue;
    console.log('\n========================================');
    console.log('OPEN THIS URL IN YOUR BROWSER:');
    console.log(loginUrl);
    console.log('========================================');
    console.log('\nLog in with your sandbox account (benji@mccarthys.nz)');
    console.log('Waiting for callback...\n');
  } else {
    console.log('ERROR: Could not get OAuth URL');
    console.log(data);
  }
}

// Step 2: Callback - QM posts the token here after user logs in
app.post('/callback', (req, res) => {
  console.log('\n--- Step 2: OAuth Callback Received ---');
  console.log('Data:', JSON.stringify(req.body, null, 2));

  userOAuthToken = req.body.Token;

  res.send('<h1>Success! Token received. You can close this window.</h1><p>Go back to the terminal.</p>');

  console.log('\nUserOAuthToken:', userOAuthToken);
  console.log('\nNow getting API Access Token...\n');

  // Step 3: Get API Access Token
  getAccessToken();
});

// Also handle GET callback in case QM redirects instead of POSTs
app.get('/callback', (req, res) => {
  console.log('\n--- Step 2: OAuth Callback Received (GET) ---');
  console.log('Query:', JSON.stringify(req.query, null, 2));

  userOAuthToken = req.query.Token || req.query.token;

  res.send('<h1>Success! Token received. You can close this window.</h1><p>Go back to the terminal.</p>');

  if (userOAuthToken) {
    console.log('\nUserOAuthToken:', userOAuthToken);
    console.log('\nNow getting API Access Token...\n');
    getAccessToken();
  } else {
    console.log('Full callback data:', req.query);
  }
});

// Step 3: Get API Access Token
async function getAccessToken() {
  const timestamp = Date.now();
  const hashInput = COMPANY_KEY + userOAuthToken + SECRET_KEY + timestamp;
  const hashKey = crypto.createHash('sha256').update(hashInput).digest('hex');

  console.log('--- Step 3: Getting Access Token ---');

  const url = `${BASE_URL}/api/TPU/Authorize/GetAccessToken`;
  const body = {
    CompanyKey: COMPANY_KEY,
    UserOAuthToken: userOAuthToken,
    HashKey: hashKey,
    Timestamp: timestamp
  };

  console.log('POST', url);
  console.log('Body:', JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.Response && data.Response.AccessToken && data.Response.AccessToken.Token) {
    const accessToken = data.Response.AccessToken.Token;
    console.log('\n========================================');
    console.log('ACCESS TOKEN RECEIVED!');
    console.log('========================================\n');

    // Step 4: Test creating a quote
    await createTestQuote(accessToken);
  } else {
    console.log('\nERROR: Could not get access token');
  }
}

// Step 4: Create a test quote
async function createTestQuote(accessToken) {
  console.log('--- Step 4: Creating Test Quote ---\n');

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
            BenefitId: 4, // Trauma
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

  console.log('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  console.log('\n========================================');
  console.log('QUOTE RESULT:');
  console.log('========================================\n');

  if (data.Response && data.Response.AppId) {
    console.log('Quote ID:', data.Response.AppId);
    console.log('Crunch Time:', data.Response.CrunchTime);

    const results = data.Response.QuoteResultList;
    if (results && results.length > 0) {
      console.log(`\nGot ${results.length} provider results!\n`);

      results.forEach((result, i) => {
        if (result.Provider) {
          const p = result.Provider;
          console.log(`${i + 1}. ${p.ProviderName} — $${p.TotalPremium?.toFixed(2) || 'N/A'}/yr | QPR Rating: ${p.QprRating || 'N/A'}`);
        }
      });

      console.log('\n========================================');
      console.log('API IS WORKING! You can build this.');
      console.log('========================================\n');
    } else {
      console.log('Quote created but no results returned. Full response:');
      console.log(JSON.stringify(data, null, 2).substring(0, 2000));
    }
  } else {
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2).substring(0, 2000));
  }

  console.log('\nDone! Press Ctrl+C to stop the server.\n');
}

// Start server and kick off OAuth
const server = app.listen(PORT, async () => {
  console.log(`\nLocal callback server running on port ${PORT}`);

  // Need dotenv
  if (!COMPANY_KEY || !SECRET_KEY) {
    console.log('ERROR: Missing env vars. Check .env file.');
    process.exit(1);
  }

  await getOAuthUrl();
});
