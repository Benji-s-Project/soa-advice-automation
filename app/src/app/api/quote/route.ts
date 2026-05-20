import { NextRequest, NextResponse } from 'next/server';
import { createQuote, type QuoteInput } from '@/lib/qm-api';

export async function POST(req: NextRequest) {
  try {
    const body: QuoteInput = await req.json();
    const result = await createQuote(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
