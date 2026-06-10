const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://fahem_mcp:RJkyLV67fo6hEqUv@fahemcluster-pri.trf718.mongodb.net/?appName=FahemCluster";

async function main() {
  console.log("Attempting to connect to MongoDB Atlas...");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000
  });
  
  try {
    await client.connect();
    console.log("SUCCESS! Successfully connected to MongoDB Atlas directly from this machine!");
    const db = client.db("fahem_sandbox");
    
    console.log("Listing collections...");
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
  } catch (err) {
    console.error("FAILED to connect directly to MongoDB Atlas:", err.message);
  } finally {
    await client.close();
  }
}

main();
