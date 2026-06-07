import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/home",
        "/*/admin/",
        "/*/settings/",
        "/drafts/",
      ],
    },
    sitemap: "https://fahem.pro/sitemap.xml",
  };
}
