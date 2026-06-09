import { MetadataRoute } from "next";

const LOCALES = ["en", "ar", "es", "fr", "de", "zh", "it"];
const BASE_URL = "https://fahem.pro";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];

  // Add static public pages (landing, terms, privacy, contact, report) for each locale
  for (const locale of LOCALES) {
    // Landing
    routes.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    });

    // Contact Us
    routes.push({
      url: `${BASE_URL}/${locale}/contact`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });

    // Report Issues
    routes.push({
      url: `${BASE_URL}/${locale}/report`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });

    // Terms
    routes.push({
      url: `${BASE_URL}/${locale}/terms`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.3,
    });

    // Privacy
    routes.push({
      url: `${BASE_URL}/${locale}/privacy`,
      lastModified: new Date("2026-06-07"),
      changeFrequency: "monthly",
      priority: 0.3,
    });
  }

  // Fetch dynamic public profile usernames by proxying to the Python backend (Invariant #1)
  let usernames: string[] = [];
  const agentUrl = (process.env.MONGODB_AGENT_URL || "http://localhost:8000").trim();
  if (agentUrl) {
    try {
      const res = await fetch(`${agentUrl}/public/usernames`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.usernames)) {
          usernames = data.usernames;
        }
      } else {
        console.error(`[sitemap] Failed to fetch dynamic usernames from backend: ${res.status}`);
      }
    } catch (err) {
      console.error("[sitemap] Failed to fetch dynamic usernames from backend:", err);
    }
  }

  // Add dynamic profile URLs for each locale
  for (const username of usernames) {
    for (const locale of LOCALES) {
      routes.push({
        url: `${BASE_URL}/${locale}/profile/${username}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return routes;
}
