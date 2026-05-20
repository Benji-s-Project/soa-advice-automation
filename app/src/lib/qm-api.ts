import { getAccessToken } from './qm-auth';

const BASE_URL = process.env.QM_BASE_URL!;
const USER_OAUTH_TOKEN = process.env.QM_USER_OAUTH_TOKEN!;

async function qmFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken(USER_OAUTH_TOKEN);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  return res.json();
}

export interface QuoteInput {
  firstName: string;
  lastName: string;
  age: number;
  dateOfBirth: string;
  gender: number; // 1 = Male, 2 = Female
  smoker: boolean;
  occupationClass: number; // 1-5
  employedStatus: number; // 1 = Employed, 2 = Self-Employed > 3 Years, 3 = Self-Employed < 3 Years, 4 = Non-Earner
  benefits: BenefitInput[];
}

export interface BenefitInput {
  benefitId: number; // 1 = Life, 2 = IP, 3 = Medical, 4 = Trauma, 5 = TPD
  coverAmount: number;
  standalone?: boolean;
  indexed?: boolean;
  frequency?: number; // 1 = Yearly, 12 = Monthly
}

export interface QuoteResult {
  appId: number;
  crunchTime: string;
  providers: ProviderResult[];
}

export interface ProviderResult {
  providerName: string;
  providerId: number;
  totalPremium: number;
  qprRating: number | null;
  products: ProductResult[];
}

export interface ProductResult {
  productName: string;
  productId: number;
  premium: number;
  coverDetail: string;
}

export async function createQuote(input: QuoteInput): Promise<QuoteResult> {
  const benefitList = input.benefits.map((b) => ({
    BenefitId: b.benefitId,
    QuoteOption: {
      Indexed: b.indexed ?? true,
      IsLevel: false,
      Frequency: b.frequency ?? 1,
      Factor: 0,
      LifeBuyBack: false,
      TraumaBuyBack: false,
      InstantTraumaBuyback: false,
      TpdAddOn: false,
      TpdOwnOccupation: true,
      TpdAnyOccupation: false,
      ChildTrauma: false,
      ChildCoverAmount: 0,
      Standalone: b.standalone ?? true,
      Accelerated: false,
      LifeCoverAmount: 0,
      CalcPeriod: { Name: 'Yearly Renewable', Value: 1 },
      IsSeriousTrauma: false,
      SeriousTraumaCoverAmount: 0,
      Loading: { Name: '0%', Value: 1 },
      CoverAmount: b.coverAmount,
    },
  }));

  const data = await qmFetch('/api/Quote', {
    method: 'POST',
    body: JSON.stringify({
      AppId: 0,
      PeopleEntity: [
        {
          OccupationId: { Name: `Class ${input.occupationClass}`, Value: input.occupationClass },
          EmployedStatus: { Name: 'Employed', Value: input.employedStatus },
          Gender: input.gender,
          Smoker: input.smoker,
          BenefitList: benefitList,
          FirstName: input.firstName,
          LastName: input.lastName,
          ClientId: 0,
          Age: input.age,
          DateOfBirth: input.dateOfBirth,
        },
      ],
      NoExtraData: true,
    }),
  });

  const response = data.Response;
  const allResults = [
    ...(response.QuoteResultList || []),
    ...(response.BankQuoteResultList || []),
  ];

  const providers: ProviderResult[] = allResults
    .filter((r: any) => r.Provider)
    .map((r: any) => ({
      providerName: r.Provider.ProviderName || 'Unknown',
      providerId: r.Provider.ProviderId,
      totalPremium: r.Provider.TotalPremium || 0,
      qprRating: r.Provider.QprRating || null,
      products: (r.Result || []).flatMap((client: any) =>
        (client.BenefitList || []).flatMap((benefit: any) =>
          (benefit.ProductEntityList || [])
            .filter((p: any) => p.Premium > 0)
            .map((p: any) => ({
              productName: p.ProductName,
              productId: p.ProductId,
              premium: p.Premium,
              coverDetail: p.CoverDetail || '',
            }))
        )
      ),
    }));

  return {
    appId: response.AppId,
    crunchTime: response.CrunchTime,
    providers,
  };
}

export async function generateReport(
  quoteId: number,
  options: {
    hasPricingReport?: boolean;
    hasResearchReport?: boolean;
    hasSOAReport?: boolean;
    hasPackageBreakdown?: boolean;
  } = {}
) {
  return qmFetch('/api/Report/SOA', {
    method: 'POST',
    body: JSON.stringify({
      appId: quoteId,
      hasPricingReport: options.hasPricingReport ?? true,
      hasResearchReport: options.hasResearchReport ?? true,
      hasSOAReport: options.hasSOAReport ?? true,
      hasPackageBreakdown: options.hasPackageBreakdown ?? true,
      isReplacingExistingInsurance: false,
      includeCheckMonster: false,
    }),
  });
}

export async function getQprRatings(quoteId: number) {
  return qmFetch(`/api/Research/QprRating?quoteId=${quoteId}`);
}

export async function getSavedQuotes() {
  return qmFetch('/api/Quote/SavedQuotes');
}

export async function getProviders() {
  return qmFetch('/api/Quote/Providers');
}
