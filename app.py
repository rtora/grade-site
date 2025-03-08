import sqlite3
import os
import sys
import requests
from flask import Flask, request, jsonify, send_from_directory
from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from models import Base, GradeData
from flask_cors import CORS
from flask_caching import Cache
from pathlib import Path

# Load database at startup with in-memory optimization
def download_database_file():
    """Download the database file from Google Drive if needed"""
    try:
        db_path = 'university_grades.db'
        app_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(app_dir, db_path)
        
        print(f"Checking for database at: {full_path}", file=sys.stderr)
        
        # Skip download if file exists
        if os.path.exists(full_path):
            print(f"Database file already exists at {full_path}, skipping download", file=sys.stderr)
            
            # Verify it's a valid database before continuing
            try:
                conn = sqlite3.connect(full_path)
                conn.execute("SELECT name FROM sqlite_master LIMIT 1")
                conn.close()
                return full_path
            except sqlite3.DatabaseError:
                print(f"Existing database file is invalid, will re-download", file=sys.stderr)
        
        print(f"Downloading database from Google Drive...", file=sys.stderr)
        
        # Direct download approach with Google Drive
        file_id = "1VkzOs-x1Hepee2TbOkmuYfRWo77Q3Thn"
        
        # First get a confirmation token
        session = requests.Session()
        
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        response = session.get(url, stream=True)
        
        # Look for the download token in the response
        token = None
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                token = value
                break
        
        if token:
            url = f"{url}&confirm={token}"
        
        # Now download with the token
        print(f"Downloading from URL: {url}", file=sys.stderr)
        
        # Use a decent timeout and stream the response
        response = session.get(url, stream=True, timeout=120)
        
        # Save the file
        with open(full_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192): 
                if chunk:
                    f.write(chunk)
        
        file_size = os.path.getsize(full_path)
        print(f"Downloaded file (size: {file_size} bytes) to {full_path}", file=sys.stderr)
        
        # Create indexes
        import create_indexes
        create_indexes.create_indexes(full_path)
        
        return full_path
            
    except Exception as e:
        print(f"ERROR in download_database_file: {e}", file=sys.stderr)
        raise

# Create a global database connection at module level
print("Starting application - loading database into memory at startup", file=sys.stderr)
DB_PATH = download_database_file()

# Single in-memory connection to be shared by all threads
DB_CONN = None

def get_memory_connection():
    """Creates a shared in-memory SQLite connection at startup"""
    global DB_CONN
    
    if DB_CONN is None:
        print(f"Loading database into memory from: {DB_PATH}", file=sys.stderr)
        
        # Create a memory database
        DB_CONN = sqlite3.connect(':memory:', check_same_thread=False)
        
        # Load from disk to memory
        disk_conn = sqlite3.connect(DB_PATH)
        disk_conn.backup(DB_CONN)
        disk_conn.close()
        
        # Optimize SQLite settings for static database
        DB_CONN.execute("PRAGMA cache_size = -32000;")     # 32MB cache
        DB_CONN.execute("PRAGMA journal_mode = MEMORY;")   # In-memory journal
        DB_CONN.execute("PRAGMA synchronous = OFF;")       # No sync for read-only DB
        DB_CONN.execute("PRAGMA temp_store = MEMORY;")     # Temp tables in memory
        DB_CONN.execute("PRAGMA mmap_size = 30000000;")    # 30MB memory map
        
        print("Database loaded into memory successfully", file=sys.stderr)
    
    return DB_CONN

# Create connection at startup to avoid first-request delay
DB_CONN = get_memory_connection()
print("Memory database initialized and ready for queries", file=sys.stderr)

# Create Flask app
app = Flask(__name__, static_url_path='/static')
CORS(app, resources={r"/*": {"origins": [
    "http://collegegrades.org",
    "https://collegegrades.org",
    "https://www.collegegrades.org",
    "http://www.collegegrades.org",
    "https://collegegrades-production.up.railway.app",
    "http://collegegrades-production.up.railway.app",
]}})

# Configure Flask-Caching with memory cache
cache_config = {
    'CACHE_TYPE': 'SimpleCache',  # Memory cache is fine for single worker
    'CACHE_DEFAULT_TIMEOUT': 3600
}
app.config.from_mapping(cache_config)
cache = Cache(app)

# SQLAlchemy engine - configured to use our preloaded global connection
engine = create_engine(
    'sqlite://',
    creator=lambda: DB_CONN,  # Just return the global connection
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