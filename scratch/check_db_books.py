import os
import sys
import logging
from pymongo import MongoClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("check_db")

# Add agents directory to sys.path to import helpers
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agents")))

from tools import get_mongodb_uri
from agent import get_active_db

def main():
    uri = get_mongodb_uri()
    if not uri:
        logger.error("No MongoDB URI found.")
        return
    
    logger.info(f"Connecting to MongoDB with URI starting with {uri[:30]}...")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command('ping')
        logger.info("Connected to MongoDB successfully!")
        mdb = get_active_db(client)
        logger.info(f"Using database: {mdb.name}")
        
        logger.info("Listing all books:")
        for book in mdb["books"].find():
            logger.info(f"- ID: {book.get('_id')}, Title: '{book.get('title')}', Title Ar: '{book.get('title_ar')}', Subject ID: '{book.get('subject_id')}', Owner: '{book.get('owner_uid')}', Visibility: '{book.get('visibility')}'")
            
        logger.info("Listing all subjects:")
        for subj in mdb["subjects"].find():
            logger.info(f"- ID: {subj.get('_id')}, Name: '{subj.get('name')}', Name Ar: '{subj.get('name_ar')}'")
            
    except Exception as e:
        logger.error(f"Error checking DB: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
