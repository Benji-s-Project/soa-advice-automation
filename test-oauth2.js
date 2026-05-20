const express = require('express');
const crypto = require('crypto');
require('dotenv/config');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BASE_URL = process.env.QM_BASE_URL;
const COMPANY_KEY = process.env.QM_COMPANY_KEY;
const SECRET_KEY = process.env.QM_SECRET_KEY;
const PORT = 3456;

// Use the SANDBOX site itself as the redirect — QM will redirect back to their own domain
// But we set redirect to our local server
const REDIRECT_URL = `http://localhost:${PORT}/callback`;

// Serve a simple page at root
app.get('/', (req, res) => {
  res.send(`
    <h1>QM OAuth Test</h1>
    <p>If you already have a UserOAuthToken, paste it below:</p>
    <form action="/test-token" method="POST">
      <input type="text" name="token" placeholder="Paste UserOAuthToken here" style="width:500px;padding:8px" />
      <button type="submit" style="padding:8px 16px">Test It</button>
    </form>
    <br>
    <p>Or <a href="/start-oauth">click here to start OAuth flow</a></p>
  `);
});

// Start OAuth
app.get('/start-oauth', async (req, res) => {
  const url = `${BASE_URL}/api/ThirdCompany/OAuth?key=${COMPANY_KEY}&redirectUrl=${encodeURIComponent(REDIRECT_URL)}`;
  const response = await fetch(url, { method: 'POST' });
  const data = await response.json();

  if (data.Response && data.Response.MessageCode === 200) {
    const loginUrl = data.Response.ExtValue;
    console.log('\nOAuth URL:', loginUrl);
    res.redirect(loginUrl);
  } else {
    res.send('Error: ' + JSON.stringify(data));
  }
});

// Callback - catch token from QM
app.post('/callback', async (req, res) => {
  console.log('\n--- CALLBACK RECEIVED (POST) ---');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  const token = req.body.Token || req.body.token;
  if (token) {
    console.log('\nUserOAuthToken:', token);
    res.send(`<h1>Token received!</h1><p>Token: ${token}</p><p>Check terminal for quote results.</p>`);
    await getAccessTokenAndTest(token);
  } else {
    res.send(`<h1>Callback received but no token found</h1><pre>${JSON.stringify(req.body, null, 2)}</pre>`);
  }
});

app.get('/callback', async (req, res) => {
  console.log('\n--- CALLBACK RECEIVED (GET) ---');
  console.log('Query:', JSON.stringify(req.query, null, 2));

  const token = req.query.Token || req.query.token;
  if (token) {
    console.log('\nUserOAuthToken:', token);
    res.send(`<h1>Token received!</h1><p>Check terminal for quote results.</p>`);
    await getAccessTokenAndTest(token);
  } else {
    res.send(`<h1>Callback received but no token found</h1><pre>${JSON.stringify(req.query, null, 2)}</pre>`);
  }
});

// Manual token test
app.post('/test-token', async (req, res) => {
  const token = req.body.token;
  if (!token) {
    res.send('No token provided');
    return;
  }
  console.log('\nTesting manually provided token:', token);
  res.send('<h1>Testing token... check terminal for results.</h1>');
  await getAccessTokenAndTest(token);
});

async function getAccessTokenAndTest(userOAuthToken) {
  const timestamp = Date.now();
  const hashInput = COMPANY_KEY + userOAuthToken + SECRET_KEY + timestamp;
  const hashKey = crypto.createHash('sha256').update(hashInput).digest('hex');

  console.log('\n--- Getting Access Token ---');

  const url = `${BASE_URL}/api/TPU/Authorize/GetAccessToken`;
  const body = {
    CompanyKey: COMPANY_KEY,
    UserOAuthToken: userOAuthToken,
    HashKey: hashKey,
    Timestamp: timestamp
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('Auth Response:', JSON.stringify(data, null, 2).substring(0, 1500));

    if (data.Response && data.Response.AccessToken && data.Response.AccessToken.Token) {
      const accessToken = data.Response.AccessToken.Token;
      console.log('\n ACCESS TOKEN RECEIVED!\n');
      await createTestQuote(accessToken);
    } else {
      console.log('\nCould not get access token.');
    }
  } catch (e) {
    console.log('Error:', e.message);
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

  try {
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
        console.log('Quote created but no provider results returned.');
        console.log(JSON.stringify(data, null, 2).substring(0, 2000));
      }
    } else {
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 2000));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

app.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}`);
  console.log('\nTwo options:');
  console.log('1. Go to http://localhost:3456 and click "start OAuth flow"');
  console.log('2. Or paste a UserOAuthToken directly on that page');
  console.log('\nWaiting...\n');
});
