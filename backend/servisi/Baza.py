import os
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import declarative_base
from databases import Database
from dotenv import load_dotenv

load_dotenv()  

DATABASE_URL = os.getenv("DATABASE_URL_ASYNC")
SYNC_DATABASE_URL = os.getenv("DATABASE_URL_SYNC")

database = Database(DATABASE_URL)
metadata = MetaData()
Base = declarative_base()

engine = create_engine(SYNC_DATABASE_URL)

def create_tables():
    Base.metadata.create_all(engine)
