import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

// Highly detailed fallback database of educational institutions and branches for Egypt, UAE, and KSA
const FALLBACK_INSTITUTIONS: Record<string, Array<{ name: string; type: "school" | "university"; branches: string[] }>> = {
  egypt: [
    {
      name: "Cairo University (جامعة القاهرة)",
      type: "university",
      branches: ["Giza Main Campus (الحرم الرئيسي بالجيزة)", "Sheikh Zayed Branch (فرع الشيخ زايد)"]
    },
    {
      name: "Ain Shams University (جامعة عين شمس)",
      type: "university",
      branches: ["Abbassia Main Campus (الحرم الرئيسي بالعباسية)", "El-Obour Campus (فرع العبور)"]
    },
    {
      name: "American University in Cairo (الجامعة الأمريكية بالقاهرة - AUC)",
      type: "university",
      branches: ["New Cairo Campus (حرم التجمع الخامس)", "Tahrir Square Campus (حرم ميدان التحرير)"]
    },
    {
      name: "German University in Cairo (الجامعة الألمانية بالقاهرة - GUC)",
      type: "university",
      branches: ["New Cairo Campus (حرم التجمع)", "Sherouk Campus (فرع الشروق)"]
    },
    {
      name: "Victoria College (كلية فيكتوريا)",
      type: "school",
      branches: ["Alexandria Branch (فرع الإسكندرية)", "Maadi Cairo Branch (فرع المعادي بالقاهرة)"]
    },
    {
      name: "International School of Choueifat (مدرسة الشويفات الدولية)",
      type: "school",
      branches: ["New Cairo Branch (فرع التجمع الخامس)", "6th of October Branch (فرع السادس من أكتوبر)"]
    },
    {
      name: "El Alsson International School (مدرسة الألسن الدولية)",
      type: "school",
      branches: ["New Giza Campus (فرع نيو جيزة)", "Haraneya Campus (الفرع القديم بالحرانية)"]
    },
    {
      name: "Heliopolis Language School (مدرسة مصر الجديدة للغات)",
      type: "school",
      branches: ["Heliopolis Branch (فرع مصر الجديدة)", "Sherouk City Branch (فرع الشروق)"]
    },
    {
      name: "Gamal Abdel Nasser Language School (مدرسة جمال عبد الناصر التجريبية للغات)",
      type: "school",
      branches: [
        "72 Nakhla Al Motieai, Heliopolis, Cairo (مصر الجديدة، القاهرة)",
        "2 El Fayoum St., Dokki, Giza (الدقي، الجيزة)",
        "Alexandria Branch (فرع الإسكندرية)"
      ]
    }
  ],
  uae: [
    {
      name: "American University of Sharjah (الجامعة الأمريكية في الشارقة - AUS)",
      type: "university",
      branches: ["University City Campus, Sharjah (حرم المدينة الجامعية بالشارقة)"]
    },
    {
      name: "United Arab Emirates University (جامعة الإمارات العربية المتحدة - UAEU)",
      type: "university",
      branches: ["Al Ain Main Campus (الحرم الرئيسي بالعين)"]
    },
    {
      name: "Khalifa University (جامعة خليفة)",
      type: "university",
      branches: ["Main Campus, Abu Dhabi (الحرم الرئيسي بأبوظبي)", "Sas Al Nakhl Campus (حرم ساس النخل)", "Masdar City Campus (حرم مدينة مصدر)"]
    },
    {
      name: "Zayed University (جامعة زايد)",
      type: "university",
      branches: ["Dubai Academic City Campus (حرم دبي)", "Abu Dhabi Khalifa City Campus (حرم أبوظبي)"]
    },
    {
      name: "GEMS World Academy (أكاديمية جيمس العالمية)",
      type: "school",
      branches: ["Al Barsha, Dubai (فرع البرشاء دبي)", "Abu Dhabi Campus (فرع أبوظبي)"]
    },
    {
      name: "Dubai British School (مدرسة دبي البريطانية)",
      type: "school",
      branches: ["Emirates Hills (فرع تلال الإمارات)", "Jumeirah Park (فرع جميرا بارك)"]
    },
    {
      name: "Repton School (مدرسة ريبتون)",
      type: "school",
      branches: ["Nad Al Sheba, Dubai (فرع ند الشبا دبي)", "Al Reem Island, Abu Dhabi (فرع جزيرة الريم أبوظبي)"]
    }
  ],
  ksa: [
    {
      name: "King Saud University (جامعة الملك سعود)",
      type: "university",
      branches: ["Riyadh Main Campus (الحرم الرئيسي بالرياض)", "Female Student Campus (حرم الطالبات بالدرعية)"]
    },
    {
      name: "King Abdulaziz University (جامعة الملك عبدالعزيز)",
      type: "university",
      branches: ["Jeddah Sulaimaniyah Campus (حرم السليمانية بجدة)", "Faisal Campus (فرع الفيصلية)"]
    },
    {
      name: "King Fahd University of Petroleum and Minerals (جامعة الملك فهد للبترول والمعادن)",
      type: "university",
      branches: ["Dhahran Campus (حرم الظهران الرئيسي)"]
    },
    {
      name: "Kingdom Schools (مدارس المملكة)",
      type: "school",
      branches: ["Riyadh Campus (حرم الرياض الرئيسي)"]
    },
    {
      name: "Al-Faisal International School (مدارس الفيصلية العالمية)",
      type: "school",
      branches: ["Riyadh Olaya Branch (فرع العليا بالرياض)", "Jeddah Branch (فرع جدة)"]
    },
    {
      name: "Darat Al-Arkam School (مدارس دار الأرقم)",
      type: "school",
      branches: ["Riyadh East Branch (فرع شرق الرياض)", "Riyadh North Branch (فرع شمال الرياض)"]
    }
  ]
};

const ALLOWED_EDUCATION_TYPES = [
  "academic_department",
  "educational_institution",
  "library",
  "preschool",
  "primary_school",
  "research_institute",
  "school",
  "secondary_school",
  "university"
];

const EDUCATION_KEYWORDS = [
  "school", "university", "college", "academy", "department", "library", "preschool", "institute", "education", "campus",
  "مدرسة", "جامعة", "أكاديمية", "كلية", "روضة", "معهد", "حضانه", "حضانة", "تعليم", "تعليمي"
];

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") || "").trim().toLowerCase();
    const country = (searchParams.get("country") || "Egypt").trim().toLowerCase();
    
    // Normalize country name
    let countryKey = "egypt";
    if (country.includes("emirates") || country.includes("uae") || country.includes("إمارات") || country.includes("دبي")) {
      countryKey = "uae";
    } else if (country.includes("saudi") || country.includes("ksa") || country.includes("سعودية") || country.includes("رياض")) {
      countryKey = "ksa";
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // If API key exists, attempt to call Google Places API
    if (apiKey && query.length >= 2) {
      try {
        // Find schools/universities in the given country
        const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + " " + country)}&key=${apiKey}`;
        const googleRes = await fetch(googleUrl);
        if (googleRes.ok) {
          const data = await googleRes.json();
          if (data.results && data.results.length > 0) {
            // Auto-filter by allowed education types and keywords
            const filteredResults = data.results.filter((p: any) => {
              const hasAllowedType = p.types && p.types.some((t: string) => ALLOWED_EDUCATION_TYPES.includes(t));
              if (hasAllowedType) return true;

              const nameLower = p.name.toLowerCase();
              const hasKeyword = EDUCATION_KEYWORDS.some((kw: string) => nameLower.includes(kw));
              if (hasKeyword) return true;

              return false;
            });

            // Group similar named places to create virtual branches or return unique locations
            const results = filteredResults.slice(0, 20).map((p: any) => {
              return {
                name: p.name,
                address: p.formatted_address || "",
                type: p.types && (p.types.includes("university") || p.types.includes("research_institute")) ? "university" : "school",
                branches: [p.formatted_address || "Main Branch"]
              };
            });
            return NextResponse.json({ results });
          }
        }
      } catch (googleErr) {
        console.error("Google Places API error, using rich fallback database:", googleErr);
      }
    }

    // High fidelity fallback search from premium database
    const list = FALLBACK_INSTITUTIONS[countryKey] || FALLBACK_INSTITUTIONS.egypt;
    const filtered = query
      ? list.filter(item => item.name.toLowerCase().includes(query))
      : list;

    const results = filtered.map(item => ({
      name: item.name,
      address: countryKey === "egypt" ? "Cairo, Egypt" : countryKey === "uae" ? "Dubai, UAE" : "Riyadh, Saudi Arabia",
      type: item.type,
      branches: item.branches
    }));

    return NextResponse.json({ results });

  } catch (err: any) {
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}
