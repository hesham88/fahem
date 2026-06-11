import asyncio
import httpx
import fitz

async def test_probe(url):
    print(f"Testing URL: {url}")
    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    headers = {"User-Agent": USER_AGENT}
    
    # 1. HEAD request
    async with httpx.AsyncClient(headers=headers) as client:
        try:
            head_res = await client.head(url, follow_redirects=True)
            print(f"HEAD Status: {head_res.status_code}")
            content_length = head_res.headers.get("Content-Length")
            print(f"Content-Length: {content_length} bytes ({int(content_length)/1024/1024:.2f} MB if present)")
        except Exception as e:
            print(f"HEAD failed: {e}")
            content_length = None

    # 2. Try merging first 128KB and last 128KB (Range requests)
    if content_length:
        total_size = int(content_length)
        print("\n--- Testing HTTP Range requests merging (First 128KB + Last 128KB) ---")
        try:
            async with httpx.AsyncClient(headers=headers) as client:
                # Fetch first 128KB
                r1 = await client.get(url, headers={"Range": "bytes=0-131071"})
                # Fetch last 128KB
                r2 = await client.get(url, headers={"Range": f"bytes={total_size-131072}-{total_size-1}"})
                
                print(f"Range 1 Status: {r1.status_code}, Range 2 Status: {r2.status_code}")
                if r1.status_code in (200, 206) and r2.status_code in (200, 206):
                    # We can construct a reconstructed PDF with null bytes in the middle!
                    # Many PDF readers can parse this because they use byte offsets from the start or end of the file.
                    # PyMuPDF/fitz supports this if we construct the full bytearray of total_size and fill the middle with 0s.
                    reconstructed = bytearray(total_size)
                    reconstructed[0:len(r1.content)] = r1.content
                    reconstructed[total_size-len(r2.content):] = r2.content
                    
                    d = fitz.open(stream=bytes(reconstructed), filetype="pdf")
                    print(f"Reconstructed PyMuPDF Page Count: {d.page_count}")
                    d.close()
        except Exception as e:
            print(f"Range merge failed: {e}")

if __name__ == "__main__":
    url = "https://assets.openstax.org/oscms-prodcms/media/documents/IntroductiontoAnthropology-WEB.pdf"
    asyncio.run(test_probe(url))
