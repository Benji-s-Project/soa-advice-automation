require('dotenv/config');

const BASE_URL = process.env.QM_BASE_URL;
const COMPANY_KEY = process.env.QM_COMPANY_KEY;
const REDIRECT_URL = 'https://webhook.site/4fabaa42-4248-4415-bac0-1ed22ee7f377';

async function getOAuthUrl() {
  const url = `${BASE_URL}/api/ThirdCompany/OAuth?key=${COMPANY_KEY}&redirectUrl=${encodeURIComponent(REDIRECT_URL)}`;

  console.log('Requesting OAuth URL...\n');
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (data.Response && data.Response.MessageCode === 200) {
    console.log('========================================');
    console.log('OPEN THIS IN YOUR BROWSER:');
    console.log(data.Response.ExtValue);
    console.log('========================================');
    console.log('\nLog in with benji@mccarthys.nz');
    console.log('After login, check webhook.site for the token');
  } else {
    console.log('Error:', JSON.stringify(data, null, 2));
  }
}

getOAuthUrl();
