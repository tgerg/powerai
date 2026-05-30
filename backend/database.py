from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import declarative_base
import os

# Use DATABASE_URL env var on Render, fall back to SQLite locally
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///operations.db")

# Render gives a postgres:// URL but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, echo=False)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password = Column(String)

class SavedQuery(Base):
    __tablename__ = "saved_queries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    question = Column(String)
    sql = Column(String)

class Dashboard(Base):
    __tablename__ = "dashboards"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    name = Column(String)

class DashboardPanel(Base):
    __tablename__ = "dashboard_panels"
    id = Column(Integer, primary_key=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"))
    name = Column(String)
    question = Column(String)
    sql = Column(String)
    rows = Column(Text)
    chart_type = Column(String)
    file_name = Column(String)
    position = Column(Integer)

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    file_name = Column(String)
    table_name = Column(String)

class DatabaseConnection(Base):
    __tablename__ = "database_connections"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    name = Column(String)
    db_type = Column(String)
    host = Column(String)
    port = Column(Integer)
    database = Column(String)
    username = Column(String)
    encrypted_password = Column(String)
    active_table = Column(String)

Base.metadata.create_all(engine)