import { NextRequest } from "next/server";
import { checkIsAdmin } from "../helper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { url, maxDepth = 10, requesterEmail } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing crawl URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!requesterEmail) {
      return new Response(JSON.stringify({ error: "Missing requesterEmail parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify requester is admin
    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    const parsedBase = new URL(targetUrl);
    const origin = parsedBase.origin;
    const host = parsedBase.host;

    const visited = new Set<string>();
    const discoveredPdfs = new Map<string, any>();
    const logs: string[] = [];

    const queue: { url: string; depth: number }[] = [{ url: targetUrl, depth: 1 }];
    const maxPagesToFetch = 100; // Increased to go as deep as possible
    let pagesFetched = 0;

    logs.push(`[INIT] Starting real crawler on: ${targetUrl} (Max Depth: ${maxDepth})`);

    while (queue.length > 0 && pagesFetched < maxPagesToFetch) {
      const current = queue.shift()!;
      
      // Clean and normalize URL
      let currUrl = current.url.split("#")[0]; // remove hash
      if (visited.has(currUrl)) continue;
      visited.add(currUrl);

      logs.push(`[CRAWL] Fetching depth ${current.depth}: ${currUrl}`);
      pagesFetched++;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout per page

        const res = await fetch(currUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          logs.push(`[WARN] Failed to fetch ${currUrl}: ${res.status} ${res.statusText}`);
          continue;
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          logs.push(`[INFO] Skipping non-HTML resource: ${currUrl} (${contentType})`);
          continue;
        }

        const html = await res.text();
        
        // Find links
        const hrefRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']/gi;
        let match;
        const currentLinks: string[] = [];

        while ((match = hrefRegex.exec(html)) !== null) {
          const rawLink = match[1].trim();
          if (!rawLink) continue;

          // Resolve absolute URL
          let resolvedLink = "";
          try {
            if (rawLink.startsWith("http://") || rawLink.startsWith("https://")) {
              resolvedLink = rawLink;
            } else if (rawLink.startsWith("//")) {
              resolvedLink = "https:" + rawLink;
            } else if (rawLink.startsWith("/")) {
              resolvedLink = origin + rawLink;
            } else {
              // Relative to current page path
              const baseDir = currUrl.substring(0, currUrl.lastIndexOf("/") + 1);
              resolvedLink = baseDir + rawLink;
            }
            
            // Clean hash and query params for normalization
            const cleanUrl = resolvedLink.split("#")[0];
            currentLinks.push(cleanUrl);
          } catch (e) {}
        }

        logs.push(`[INFO] Found ${currentLinks.length} raw links on page.`);

        for (const link of currentLinks) {
          // 1. Is it a PDF?
          if (link.toLowerCase().endsWith(".pdf")) {
            if (!discoveredPdfs.has(link)) {
              // Deduce title
              const fileName = link.split("/").pop() || "document.pdf";
              let title = fileName
                .replace(/\.pdf$/i, "")
                .replace(/[_-]/g, " ")
                .replace(/\b\w/g, c => c.toUpperCase());
              
              if (title.length > 50) {
                title = title.substring(0, 47) + "...";
              }

              discoveredPdfs.set(link, {
                id: "disc_" + Math.random().toString(36).substring(2, 9),
                title,
                titleAr: title, // Dual language support
                url: link,
                fileName,
                totalPages: 120, // estimated total pages
                bookType: "core",
                grade: "Grade 11",
                term: "Term 1",
                year: "2026",
                language: "en"
              });
              logs.push(`[DISCOVERED PDF] ${title} -> ${link}`);
            }
          } else {
            // 2. Queue for recursive crawl
            if (current.depth < maxDepth) {
              try {
                const u = new URL(link);
                // Only crawl links within the exact same host/domain to respect scoping
                if (u.host === host && !visited.has(link) && !queue.some(q => q.url === link)) {
                  queue.push({ url: link, depth: current.depth + 1 });
                }
              } catch (e) {}
            }
          }
        }

      } catch (err: any) {
        logs.push(`[ERROR] Fetching error on ${currUrl}: ${err.message}`);
      }
    }

    logs.push(`[COMPLETE] Crawled ${pagesFetched} pages. Discovered ${discoveredPdfs.size} PDFs.`);

    return new Response(JSON.stringify({
      success: true,
      discovered: Array.from(discoveredPdfs.values()),
      logs
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[crawl-api] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
