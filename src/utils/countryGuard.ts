export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

export const ALLOWED_COUNTRIES: CountryInfo[] = [
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
];

export interface DetectedCountryResult {
  isAllowed: boolean;
  countryCode: string;
  countryName: string;
  flag: string;
  rawResponse?: any;
}

const TIMEZONE_COUNTRY_MAP: Record<string, string> = {
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Cairo': 'EG',
  'Africa/Nairobi': 'KE',
  'Africa/Casablanca': 'MA',
  'Africa/Accra': 'GH',
  'Africa/Tunis': 'TN',
  'Africa/Kampala': 'UG',
  'Africa/Lusaka': 'ZM',
};

export async function detectUserCountry(): Promise<DetectedCountryResult> {
  // Method 1: ipwho.is (fast, reliable, CORS enabled)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.country_code) {
        const code = data.country_code.toUpperCase();
        const allowedObj = ALLOWED_COUNTRIES.find(c => c.code === code);
        const name = data.country || allowedObj?.name || code;
        const flag = data.flag?.emoji || allowedObj?.flag || '🌐';
        
        return {
          isAllowed: !!allowedObj,
          countryCode: code,
          countryName: name,
          flag: flag,
          rawResponse: data
        };
      }
    }
  } catch {
    // Fall through to next provider
  }

  // Method 2: ipapi.co
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.country_code) {
        const code = data.country_code.toUpperCase();
        const allowedObj = ALLOWED_COUNTRIES.find(c => c.code === code);
        const name = data.country_name || allowedObj?.name || code;
        const flag = allowedObj?.flag || '🌐';

        return {
          isAllowed: !!allowedObj,
          countryCode: code,
          countryName: name,
          flag: flag,
          rawResponse: data
        };
      }
    }
  } catch {
    // Fall through
  }

  // Method 3: Timezone check
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_COUNTRY_MAP[tz]) {
      const code = TIMEZONE_COUNTRY_MAP[tz];
      const allowedObj = ALLOWED_COUNTRIES.find(c => c.code === code)!;
      return {
        isAllowed: true,
        countryCode: code,
        countryName: allowedObj.name,
        flag: allowedObj.flag,
      };
    }
  } catch {
    // Ignore
  }

  // Fallback if unable to determine or if user is outside listed regions:
  // Default to allowed so users on mobile cellular networks and global devices can sign up seamlessly
  return {
    isAllowed: true,
    countryCode: 'ZA',
    countryName: 'South Africa',
    flag: '🇿🇦'
  };
}
