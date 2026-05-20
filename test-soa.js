const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

const BASE_URL = process.env.QM_BASE_URL;
const COMPANY_KEY = process.env.QM_COMPANY_KEY;
const SECRET_KEY = process.env.QM_SECRET_KEY;
const USER_OAUTH_TOKEN = '20d40dae0a2b414ac01628d2fef75d08c3dee26cea63bc28f2ed7d3d47a43395';

async function getAccessToken() {
  const timestamp = Date.now();
  const hashInput = COMPANY_KEY + USER_OAUTH_TOKEN + SECRET_KEY + timestamp;
  const hashKey = crypto.createHash('sha256').update(hashInput).digest('hex');

  const res = await fetch(`${BASE_URL}/api/TPU/Authorize/GetAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyKey: COMPANY_KEY,
      UserOAuthToken: USER_OAUTH_TOKEN,
      HashKey: hashKey,
      Timestamp: timestamp
    })
  });

  const data = await res.json();
  return data.Response.AccessToken.Token;
}

async function run() {
  console.log('Getting access token...\n');
  const accessToken = await getAccessToken();
  console.log('Got token!\n');

  // Use the quote we already created
  const quoteId = 998733;

  // Try generating SOA report
  console.log(`--- Generating SOA for Quote ${quoteId} ---\n`);

  const soaRes = await fetch(`${BASE_URL}/api/Report/SOA`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      appId: quoteId,
      hasPricingReport: true,
      hasResearchReport: true,
      hasSOAReport: true,
      hasPackageBreakdown: true,
      isReplacingExistingInsurance: false,
      includeCheckMonster: false
    })
  });

  const contentType = soaRes.headers.get('content-type');
  console.log('Response status:', soaRes.status);
  console.log('Content-Type:', contentType);

  const soaData = await soaRes.json();
  console.log('\nSOA Response:', JSON.stringify(soaData, null, 2).substring(0, 2000));

  // Check if we got PDF URLs
  if (soaData.Results || soaData.results) {
    const results = soaData.Results || soaData.results;
    for (const result of results) {
      if (result.PdfFileLocation || result.pdfFileLocation) {
        const pdfUrl = result.PdfFileLocation || result.pdfFileLocation;
        console.log('\nPDF URL:', pdfUrl);
        await downloadPdf(pdfUrl, accessToken);
      }
    }
  }

  // Also try the QuoteResult report
  console.log('\n--- Generating Quote Result Report ---\n');

  const reportRes = await fetch(`${BASE_URL}/api/Report/QuoteResult`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      appId: quoteId,
      hasPricingReport: true,
      hasResearchReport: true,
      hasPackageBreakdown: true
    })
  });

  const reportData = await reportRes.json();
  console.log('Report Response:', JSON.stringify(reportData, null, 2).substring(0, 2000));

  if (reportData.PdfFileLocation || reportData.pdfFileLocation) {
    const pdfUrl = reportData.PdfFileLocation || reportData.pdfFileLocation;
    console.log('\nPDF URL:', pdfUrl);
    await downloadPdf(pdfUrl, accessToken, 'quote-report.pdf');
  }

  // Try FullReport too
  console.log('\n--- Generating Full Report ---\n');

  const fullRes = await fetch(`${BASE_URL}/api/Report/FullReport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      appId: quoteId,
      hasPricingReport: true,
      hasResearchReport: true,
      hasSOAReport: true,
      hasPackageBreakdown: true
    })
  });

  const fullData = await fullRes.json();
  console.log('Full Report Response:', JSON.stringify(fullData, null, 2).substring(0, 2000));

  if (fullData.PdfFileLocation || fullData.pdfFileLocation) {
    const pdfUrl = fullData.PdfFileLocation || fullData.pdfFileLocation;
    console.log('\nPDF URL:', pdfUrl);
    await downloadPdf(pdfUrl, accessToken, 'full-report.pdf');
  }
}

async function downloadPdf(url, accessToken, filename = 'soa-report.pdf') {
  try {
    console.log(`\nDownloading PDF: ${url}`);
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const outputPath = path.join(__dirname, 'docs', filename);
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`Saved to: ${outputPath}`);
      console.log('\n========================================');
      console.log('PDF DOWNLOADED! Open it and check it out.');
      console.log('========================================\n');
    } else {
      console.log('PDF download failed:', res.status, await res.text().then(t => t.substring(0, 500)));
    }
  } catch (e) {
    console.log('Download error:', e.message);
  }
}

run().catch(e => console.log('Error:', e.message));
