# Ministry of Education (MOE) Textbook Harvesting & Scaling Report

This report documents the live harvesting metrics, structured ingestion process, and system scaling predictions for the Fahem Academic Library, crawling directly from `https://ellibrary.moe.gov.eg/books/` and end-to-end testing of sample books.

## 1. Live Harvesting Analysis

- **Source Target URL**: `https://ellibrary.moe.gov.eg/books/`
- **Discovered Textbook Count**: 4 books
- **Successfully Processed Samples**: 2 (End-to-End verified via Gemini 1.5 Pro)
- **DB Sync Pipeline Status**: DRY-RUN / DRY-EVAL SUCCESSFUL

## 2. Measurement and Scaling Forecast

To forecast the resource requirements when crawling the entire site, we use the following structural modeling:

- **Estimated Chapters per Textbook**: 6 chapters
- **Total Estimated Chapters (Site-wide)**: 24 chapters
- **Target Question Density per Chapter**: 15 items
- **Estimated Total Question Bank Count**: 360 questions

## 3. Storage Footprint & Vector Forecast

We compute the storage requirements for both unstructured content index records, structured catalog metadata documents, and high-dimensional vector search embeddings to size the MongoDB Atlas Cluster appropriately.

- **Vector Embedding Model**: Google Vertex AI `text-embedding-004`
- **Vector Dimensionality**: 768 dimensions (dense `float32` vectors)
- **Vector Index Sizing (Atlas Vector Search)**: 1.05 MB
- **Catalog Document JSON Sizing**: 0.18 MB
- **Total Atlas Cluster Minimum RAM Allocation**: 1.23 MB

## 4. Architectural Roadmap & Next Steps

1. **Complete full ingestion of all remaining discovered textbook links** (remaining 2 books).
2. **Setup Automated Cloud Storage Event Triggers**: Set up Eventarc triggers pointing to Cloud Run on bucket write events under the path `gs://fahem-88d40.firebasestorage.app/MOE Library` to ingest unstructured PDFs automatically when uploaded.
3. **Configure Atlas Vector Search Index**: Deploy vector search pipelines mapping `question_bank` vector embeddings to support semantic textbook and question retrieval.
