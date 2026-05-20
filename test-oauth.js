const express = require('express');
const crypto = require('crypto');
require('dotenv/config');

const app = express();

// Parse ALL content types
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Raw body capture for any content type we might miss
app.use((req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
});

const BASE_URL = process.env.QM_BASE_URL;
const COMPANY_KEY = process.env.QM_COMPANY_KEY;
const SECRET_KEY = process.env.QM_SECRET_KEY;
const PORT = 3456;

// Catch ALL requests to any path
app.all('/{*path}', async (req, res) => {
  console.log('\n========================================');
  console.log(`INCOMING ${req.method} ${req.path}`);
  console.log('========================================');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  if (req.rawBody) console.log('Raw Body:', req.rawBody);

  // Try to extract token from anywhere
  const token = req.body?.Token || req.body?.token || req.query?.Token || req.query?.token;

  if (token) {
    console.log('\n========================================');
    console.log('TOKEN FOUND:', token);
    console.log('========================================\n');

    res.send('<h1>Token received! Check terminal.</h1>');

    // Now get access token and test
    await getAccessTokenAndTest(token);
  } else {
    res.send('<h1>Request received - check terminal for details</h1>');
  }
});

async function getAccessTokenAndTest(userOAuthToken) {
  const timestamp = Date.now();
  const hashInput = COMPANY_KEY + userOAuthToken + SECRET_KEY + timestamp;
  const hashKey = crypto.createHash('sha256').update(hashInput).digest('hex');

  console.log('--- Getting Access Token ---');

  const url = `${BASE_URL}/api/TPU/Authorize/GetAccessToken`;
  const body = {
    CompanyKey: COMPANY_KEY,
    UserOAuthToken: userOAuthToken,
    HashKey: hashKey,
    Timestamp: timestamp
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log('Auth Response:', JSON.stringify(data, null, 2).substring(0, 1000));

  if (data.Response && data.Response.AccessToken && data.Response.AccessToken.Token) {
    const accessToken = data.Response.AccessToken.Token;
    console.log('\nACCESS TOKEN RECEIVED!\n');
    await createTestQuote(accessToken);
  } else {
    console.log('\nCould not get access token. Response above.');
  }
}

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
    } else {
      console.log('Quote created but no results. Full response:');
      console.log(JSON.stringify(data, null, 2).substring(0, 2000));
    }
  } else {
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 2000));
  }
}

// Start
app.listen(PORT, async () => {
  console.log(`\nCallback server running on http://localhost:${PORT}`);
  console.log('Getting OAuth URL...\n');

  // Step 1: Get OAuth URL
  const redirectUrl = `http://localhost:${PORT}/callback`;
  const url = `${BASE_URL}/api/ThirdCompany/OAuth?key=${COMPANY_KEY}&redirectUrl=${encodeURIComponent(redirectUrl)}`;

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (data.Response && data.Response.MessageCode === 200) {
    console.log('========================================');
    console.log('OPEN THIS IN YOUR BROWSER:');
    console.log(data.Response.ExtValue);
    console.log('========================================\n');
    console.log('Log in with benji@mccarthys.nz');
    console.log('Waiting for callback...\n');
  } else {
    console.log('Error:', data);
  }
});
