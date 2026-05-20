'use client';

import { useState } from 'react';

interface ProviderResult {
  providerName: string;
  totalPremium: number;
  qprRating: number | null;
  products: { productName: string; premium: number; coverDetail: string }[];
}

interface QuoteResult {
  appId: number;
  crunchTime: string;
  providers: ProviderResult[];
}

interface ExtractedData {
  clientName: string;
  age: number;
  gender: string;
  smoker: boolean;
  occupation: string;
  coverTypes: string[];
  coverAmount: number;
  recommendation: string;
}

export default function Dashboard() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [stage, setStage] = useState('');
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcript.trim()) return;

    setLoading(true);
    setError('');
    setQuoteResult(null);
    setExtractedData(null);
    setPdfUrl(null);

    try {
      // Stage 1: Extract data from transcript
      setStage('Analysing call transcript...');
      await new Promise((r) => setTimeout(r, 1500));

      // Simulated extraction (will be replaced with AI)
      const extracted: ExtractedData = {
        clientName: 'Sarah Thompson',
        age: 42,
        gender: 'Female',
        smoker: false,
        occupation: 'Marketing Manager',
        coverTypes: ['Trauma', 'Life'],
        coverAmount: 200000,
        recommendation: 'Recommending standalone trauma cover at $200k with AIA based on strong QPR ratings and competitive premiums for her age bracket. Also recommending $500k life cover to protect the mortgage and provide for the two kids.',
      };
      setExtractedData(extracted);

      // Stage 2: Pull client data from Trail
      setStage('Pulling client data from Trail CRM...');
      await new Promise((r) => setTimeout(r, 1000));

      // Stage 3: Generate quotes
      setStage('Generating quotes across all insurers...');
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Sarah',
          lastName: 'Thompson',
          age: 42,
          dateOfBirth: '1984-03-15',
          gender: 2,
          smoker: false,
          occupationClass: 1,
          employedStatus: 1,
          benefits: [
            { benefitId: 4, coverAmount: 200000, standalone: true },
          ],
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setStage('Building SOA document...');
        await new Promise((r) => setTimeout(r, 1200));
        setQuoteResult(data);
        setStage('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold">
              S
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">SOA Engine</h1>
              <p className="text-xs text-white/40">Lewer Financial Services</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Connected to Quote Monster</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Bar */}
        {loading && stage && (
          <div className="mb-6 flex items-center gap-3 bg-blue-500/5 border border-blue-500/10 rounded-xl px-5 py-3">
            <div className="relative">
              <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
            <span className="text-sm text-blue-400">{stage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="font-semibold text-sm text-white/80">Call Transcript</h2>
                <p className="text-xs text-white/30 mt-0.5">Paste or auto-import from Marloo</p>
              </div>
              <form onSubmit={handleSubmit} className="p-4">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste the call transcript here...

The AI will extract:
- Client details (name, age, gender, smoker status)
- Cover requirements (type, amount)
- Your recommendation and reasoning
- Product preferences"
                  className="w-full h-72 bg-white/[0.02] border border-white/5 rounded-xl p-4 text-sm text-white/90 placeholder-white/20 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !transcript.trim()}
                  className="mt-3 w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all text-sm"
                >
                  {loading ? 'Processing...' : 'Generate SOA'}
                </button>
              </form>
            </div>

            {/* Extracted Data Card */}
            {extractedData && (
              <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="font-semibold text-sm text-white/80">Extracted from Transcript</h2>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Client" value={extractedData.clientName} />
                    <InfoField label="Age" value={String(extractedData.age)} />
                    <InfoField label="Gender" value={extractedData.gender} />
                    <InfoField label="Smoker" value={extractedData.smoker ? 'Yes' : 'No'} />
                    <InfoField label="Occupation" value={extractedData.occupation} />
                    <InfoField label="Cover Amount" value={`$${extractedData.coverAmount.toLocaleString()}`} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {extractedData.coverTypes.map((type) => (
                      <span
                        key={type}
                        className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-medium"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-xs text-white/40 mb-1">Adviser Recommendation</p>
                    <p className="text-sm text-white/70 leading-relaxed">{extractedData.recommendation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3">
            {!quoteResult && !loading && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white/40">No SOA generated yet</h3>
                <p className="text-xs text-white/20 mt-1">Paste a call transcript to get started</p>
              </div>
            )}

            {quoteResult && (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-blue-500/5 to-violet-500/5 border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-semibold text-white/90">Insurance Quote Comparison</h2>
                      <p className="text-xs text-white/40 mt-0.5">
                        {extractedData?.clientName} — {extractedData?.coverTypes.join(', ')} — ${extractedData?.coverAmount.toLocaleString()} cover
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/30">Quote #{quoteResult.appId}</p>
                      <p className="text-xs text-white/30">{quoteResult.crunchTime}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-xs text-white/40">{quoteResult.providers.length} insurers compared</span>
                  </div>
                </div>

                {/* Provider Cards */}
                {quoteResult.providers
                  .filter((p) => p.totalPremium > 0)
                  .sort((a, b) => a.totalPremium - b.totalPremium)
                  .map((provider, i) => (
                    <div
                      key={i}
                      className={`bg-white/[0.02] border rounded-2xl p-5 transition-all hover:bg-white/[0.04] ${
                        i === 0 ? 'border-emerald-500/20 ring-1 ring-emerald-500/10' : 'border-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white/90">{provider.providerName}</h3>
                            {i === 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-400 font-medium uppercase tracking-wider">
                                Best Price
                              </span>
                            )}
                          </div>
                          {provider.qprRating && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex">
                                {[...Array(5)].map((_, s) => (
                                  <div
                                    key={s}
                                    className={`w-3 h-3 rounded-sm mr-0.5 ${
                                      s < Math.round(provider.qprRating! / 20) ? 'bg-amber-400' : 'bg-white/10'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-white/30 ml-1">QPR {provider.qprRating}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-white/90">
                            ${provider.totalPremium.toFixed(0)}
                          </span>
                          <span className="text-sm text-white/40">/yr</span>
                          <p className="text-xs text-white/30 mt-0.5">
                            ${(provider.totalPremium / 12).toFixed(2)}/mo
                          </p>
                        </div>
                      </div>

                      {provider.products.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                          {provider.products.map((product, j) => (
                            <div key={j} className="flex justify-between items-center text-sm">
                              <span className="text-white/50">{product.productName}</span>
                              <span className="text-white/70 font-medium">${product.premium.toFixed(2)}/yr</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      if (!quoteResult) return;
                      setGeneratingPdf(true);
                      try {
                        const res = await fetch('/api/soa', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ quoteId: quoteResult.appId }),
                        });
                        const data = await res.json();
                        if (data.pdfUrl) {
                          setPdfUrl(data.pdfUrl);
                          window.open(data.pdfUrl, '_blank');
                        } else {
                          console.log('SOA debug:', JSON.stringify(data.debug, null, 2));
                          setError('PDF not generated — check browser console for details.');
                        }
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setGeneratingPdf(false);
                      }
                    }}
                    disabled={generatingPdf}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all text-sm"
                  >
                    {generatingPdf ? 'Generating PDF...' : 'Generate Full SOA PDF'}
                  </button>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 font-medium rounded-xl transition-all text-sm flex items-center gap-2"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-500/5 border border-red-500/10 rounded-2xl p-5 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/5">
      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white/80 font-medium mt-0.5">{value}</p>
    </div>
  );
}
