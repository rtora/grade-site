import sqlite3
import os
import sys
import subprocess
import requests
from flask import Flask, request, jsonify, send_from_directory
from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from models import Base, GradeData
from flask_cors import CORS
from flask_caching import Cache
from pathlib import Path

def download_database_file():
    """Download the database file from Google Drive"""
    try:
        db_path = 'university_grades.db'
        app_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(app_dir, db_path)
        
        print(f"Checking for database at: {full_path}", file=sys.stderr)
        
        # Skip download if file exists and we're in development
        if os.path.exists(full_path) and os.environ.get('RAILWAY_ENVIRONMENT') is None:
            print(f"Database file already exists at {full_path}, skipping download", file=sys.stderr)
            
            # Verify it's a valid database before continuing
            try:
                conn = sqlite3.connect(full_path)
                conn.execute("SELECT name FROM sqlite_master LIMIT 1")
                conn.close()
                return full_path
            except sqlite3.DatabaseError:
                print(f"Existing database file is invalid, will re-download", file=sys.stderr)
                # Continue to download
        
        # Install gdown if not already installed
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "gdown"])
            print("Installed gdown successfully", file=sys.stderr)
        except Exception as e:
            print(f"Failed to install gdown: {e}", file=sys.stderr)
            raise
        
        import gdown
        
        # Delete existing file if it exists
        if os.path.exists(full_path):
            os.remove(full_path)
            
        # Google Drive file ID from the URL
        file_id = "1VkzOs-x1Hepee2TbOkmuYfRWo77Q3Thn"
        
        print(f"Downloading database using gdown...", file=sys.stderr)
        
        # Use gdown to handle the download - this properly handles Google Drive's redirects and confirmations
        output = gdown.download(f"https://drive.google.com/uc?id={file_id}", full_path, quiet=False)
        
        if output is None:
            raise Exception("Download failed - gdown returned None")
            
        print(f"Database file downloaded to {full_path}", file=sys.stderr)
        
        # Verify the file is a valid SQLite database
        try:
            conn = sqlite3.connect(full_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master LIMIT 1")
            result = cursor.fetchone()
            if result:
                print(f"Downloaded file verified as valid SQLite database", file=sys.stderr)
            conn.close()
        except sqlite3.DatabaseError as e:
            print(f"ERROR: Downloaded file is not a valid SQLite database: {e}", file=sys.stderr)
            
            # Check file size
            file_size = os.path.getsize(full_path)
            print(f"Downloaded file size: {file_size} bytes", file=sys.stderr)
            
            # Peek at file content for debugging
            try:
                with open(full_path, 'rb') as f:
                    header = f.read(100)
                    print(f"File header bytes: {header}", file=sys.stderr)
            except Exception as e:
                print(f"Error reading file header: {e}", file=sys.stderr)
                
            raise Exception("Downloaded file is not a valid SQLite database")
        
        # Create indexes
        import create_indexes
        create_indexes.create_indexes(full_path)
        
        return full_path
        
    except Exception as e:
        print(f"ERROR in download_database_file: {e}", file=sys.stderr)
        # For debugging, use a fallback tiny SQLite database
        create_empty_db()
        return 'university_grades.db'

def create_empty_db():
    """Create a tiny empty database for testing when download fails"""
    try:
        print("Creating empty database for fallback", file=sys.stderr)
        conn = sqlite3.connect('university_grades.db')
        cursor = conn.cursor()
        
        # Create a minimal schema matching your model
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS grades (
            id INTEGER PRIMARY KEY,
            "A+" FLOAT, A FLOAT, "A-" FLOAT, 
            "B+" FLOAT, B FLOAT, "B-" FLOAT,
            "C+" FLOAT, C FLOAT, "C-" FLOAT,
            "D+" FLOAT, D FLOAT, "D-" FLOAT,
            F FLOAT, Pass FLOAT, "Not Pass" FLOAT,
            Satisfactory FLOAT, Unsatisfactory FLOAT, "Not Satisfactory" FLOAT,
            Incomplete FLOAT, "In Progress" FLOAT, Withdrawn FLOAT,
            "Withdrawn Passing" FLOAT, "Withdrawn Medical" FLOAT, "Withdrawn Incomplete" FLOAT,
            Drop FLOAT, "Withdrawn from University" FLOAT, Honors FLOAT,
            "No Grade" FLOAT, Review FLOAT, Audit FLOAT,
            "Not Reported" FLOAT, Repeat FLOAT, DFWU FLOAT,
            "Pending Judicial Action" FLOAT, Withheld FLOAT, "Report In Progress" FLOAT,
            "I,RD,RP" FLOAT, "w/o I RD RP" FLOAT,
            instructor TEXT, year INTEGER, "Catalog Number" TEXT,
            subject TEXT, term TEXT, university TEXT, title TEXT, GPA FLOAT
        )
        ''')
        
        # Insert a sample record
        cursor.execute('''
        INSERT INTO grades (university, subject, year, term) 
        VALUES ('Example University', 'Sample', 2025, 'Spring')
        ''')
        
        conn.commit()
        conn.close()
        print("Created empty database successfully", file=sys.stderr)
    except Exception as e:
        print(f"Error creating empty database: {e}", file=sys.stderr)

# Try to download database at module import time
print("Starting database download process...", file=sys.stderr)
DB_PATH = download_database_file()
print(f"Database setup complete. Path: {DB_PATH}", file=sys.stderr)

app = Flask(__name__, static_url_path='/static')
CORS(app, resources={r"/*": {"origins": [
    "http://collegegrades.org",
    "https://collegegrades.org",
    "https://www.collegegrades.org",
    "http://www.collegegrades.org",
    "https://collegegrades-production.up.railway.app",
    "http://collegegrades-production.up.railway.app",
    # "http://127.0.0.1:5500",  # Add this for local development
    # "http://localhost:5500"    # Add this for local development
]}})

# Configure Flask-Caching with a simple in-memory cache
cache_config = {
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 3600
}
app.config.from_mapping(cache_config)
cache = Cache(app)

def get_memory_connection():
    """Creates an in-memory SQLite connection and loads the database into it"""
    mem_conn = sqlite3.connect(':memory:', check_same_thread=False)
    
    print(f"Loading database from: {DB_PATH}", file=sys.stderr)
    
    disk_conn = sqlite3.connect(DB_PATH)
    
    # Copy disk database to memory
    disk_conn.backup(mem_conn)
    disk_conn.close()
    
    # Optimize SQLite settings
    mem_conn.execute("PRAGMA cache_size = -32000;")
    mem_conn.execute("PRAGMA journal_mode = MEMORY;")
    mem_conn.execute("PRAGMA synchronous = OFF;")
    
    return mem_conn

# Create engine with StaticPool to reuse the same connection
engine = create_engine(
    'sqlite://',
    creator=get_memory_connection,
    connect_args={'check_same_thread': False},
    poolclass=StaticPool
)

Base.metadata.bind = engine
DBSession = sessionmaker(bind=engine)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/grades', methods=['GET'])
@cache.cached(timeout=3600, query_string=True)
def get_grades():
    try:
        session = DBSession()

        # Build base query
        query = session.query(GradeData)

        # Apply filters
        for filter_field, filter_value in request.args.items():
            if hasattr(GradeData, filter_field):
                column = getattr(GradeData, filter_field)
                query = query.filter(func.lower(column) == filter_value.lower())

        # Define columns to sum
        columns_to_sum = [
            'A_plus', 'A', 'A_minus',
            'B_plus', 'B', 'B_minus',
            'C_plus', 'C', 'C_minus',
            'D_plus', 'D', 'D_minus',
            'F', 'Pass', 'Not_Pass',
            'Satisfactory', 'Unsatisfactory', 'Not_Satisfactory',
            'Incomplete', 'In_Progress', 'Withdrawn',
            'Withdrawn_Passing', 'Withdrawn_Medical', 'Withdrawn_Incomplete',
            'Drop', 'Withdrawn_from_University', 'Honors',
            'No_Grade', 'Review', 'Audit',
            'Not_Reported', 'Repeat', 'DFWU',
            'Pending_Judicial_Action', 'Withheld', 'Report_In_Progress',
            'I_RD_RP', 'wo_I_RD_RP'
        ]

        # Prepare sum operations
        sum_operations = [func.sum(getattr(GradeData, column)).label(column) 
                         for column in columns_to_sum]
        sum_operations.append(func.avg(GradeData.GPA).label('average_GPA'))
        
        # Execute query with all sum operations
        sums_query = query.with_entities(*sum_operations)
        sums_result = sums_query.one()

        # Convert to dictionary
        result = {column: getattr(sums_result, column) for column in columns_to_sum}
        result['average_GPA'] = getattr(sums_result, 'average_GPA')

        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/autocomplete', methods=['GET'])
@cache.cached(timeout=3600, query_string=True)
def autocomplete():
    try:
        session = DBSession()

        autocomplete_field = request.args.get('autocomplete_field')
        selected_filters = request.args.to_dict()
        selected_filters.pop('autocomplete_field', None)
        search_text = selected_filters.pop('search', '')

        if not autocomplete_field or (
            autocomplete_field not in GradeData.__table__.columns and 
            autocomplete_field != 'catalog_number'
        ):
            return jsonify([])

        # Build query with distinct values
        query = session.query(getattr(GradeData, autocomplete_field)).distinct()

        # Apply filters
        for filter_field, filter_value in selected_filters.items():
            if hasattr(GradeData, filter_field):
                column = getattr(GradeData, filter_field)
                query = query.filter(func.lower(column) == filter_value.lower())

        # Apply search filter if provided
        if search_text:
            query = query.filter(
                func.lower(getattr(GradeData, autocomplete_field))
                .ilike(f"%{search_text.lower()}%")
            )

        # Order by year descending if applicable
        if autocomplete_field == 'year':
            query = query.order_by(desc(getattr(GradeData, autocomplete_field)))

        # Get results
        suggestions = [
            result[0] for result in query.limit(10).all() 
            if result[0] is not None
        ]

        return jsonify(suggestions)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)