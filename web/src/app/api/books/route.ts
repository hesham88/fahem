import { NextRequest } from "next/server";
import { MongoClient } from "mongodb";
import { checkIsAdmin } from "../admin/helper";
import { proxyRequest } from "../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    const params = new URLSearchParams();
    if (subjectId) params.append("subject_id", subjectId);

    return await proxyRequest(`/user/books?${params.toString()}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      subject_id,
      title,
      title_ar,
      grade,
      term,
      year,
      language,
      book_type,
      source_url,
      storage_path,
      chapters,
      requesterEmail
    } = await req.json();

    if (!requesterEmail || !subject_id || !title || !title_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: requesterEmail, subject_id, title, title_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify requester is admin/superadmin
    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not an authorized administrator." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return new Response(JSON.stringify({ error: "MONGODB_URI is not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("fahem");

    const bookId = "book_" + title.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();

    const newBook = {
      _id: bookId,
      subject_id,
      title,
      title_ar,
      grade: grade || "General",
      term: term || "Term 1",
      year: year || new Date().getFullYear().toString(),
      language: language || "ar",
      book_type: book_type || "core",
      source_url: source_url || "",
      storage_path: storage_path || "",
      chapters: chapters || []
    };

    // Insert book
    await db.collection("books").insertOne(newBook as any);

    // Increment books_count in the corresponding subject
    await db.collection("subjects").updateOne(
      { _id: subject_id },
      { $inc: { books_count: 1 } }
    );

    await client.close();

    return new Response(JSON.stringify({ success: true, book: newBook }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-books-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

