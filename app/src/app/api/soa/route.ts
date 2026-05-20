import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/qm-auth';

const BASE_URL = process.env.QM_BASE_URL!;
const USER_OAUTH_TOKEN = process.env.QM_USER_OAUTH_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { quoteId } = await req.json();

    if (!quoteId) {
      return NextResponse.json({ error: 'quoteId is required' }, { status: 400 });
    }

    const accessToken = await getAccessToken(USER_OAUTH_TOKEN);

    // Generate FullReport (includes pricing + research)
    const res = await fetch(`${BASE_URL}/api/Report/FullReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        appId: quoteId,
        hasPricingReport: true,
        hasResearchReport: true,
        hasPackageBreakdown: true,
      }),
    });

    const data = await res.json();

    // PDF URL is nested under Response
    const pdfUrl = data.Response?.PdfFileLocation || data.Response?.pdfFileLocation || data.PdfFileLocation || data.pdfFileLocation;

    if (pdfUrl) {
      return NextResponse.json({ pdfUrl, reportName: data.Response?.ReportName });
    }

    return NextResponse.json({
      pdfUrl: null,
      error: data.StatusMessage || 'No PDF generated',
      debug: data,
    });
  } catch (error: any) {
    console.error('SOA generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
