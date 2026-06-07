import { MetadataRoute } from "next";

const LOCALES = ["en", "ar", "es", "fr", "de", "zh", "it"];
const BASE_URL = "https://fahem.pro";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];

  // Add static public pages (landing, terms, privacy) for each locale
  for (const locale of LOCALES) {
    // Landing
    routes.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
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

  // Fetch dynamic public profile usernames from MongoDB if URI is available
  let usernames: string[] = [];
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const { MongoClient } = require("mongodb");
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      const db = client.db("fahem");
      
      const users = await db
        .collection("users")
        .find({ username: { $exists: true, $ne: "" } })
        .project({ username: 1 })
        .toArray();
      
      usernames = users.map((u: any) => u.username).filter(Boolean);
      await client.close();
    } catch (err) {
      console.error("[sitemap] Failed to fetch dynamic usernames from MongoDB:", err);
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
