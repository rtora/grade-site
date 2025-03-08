import sqlite3
import os
import requests
import sys
from flask import Flask, request, jsonify, send_from_directory
from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from models import Base, GradeData
from flask_cors import CORS
from flask_caching import Cache
from pathlib import Path

# Download database immediately at module load time
def download_database_file():
    """Download the database file from Google Drive if it doesn't exist"""
    db_path = 'university_grades.db'
    app_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(app_dir, db_path)
    
    print(f"Checking for database at: {full_path}", file=sys.stderr)
    
    # Skip download if the file already exists and we're in development
    if os.path.exists(full_path) and os.environ.get('RAILWAY_ENVIRONMENT') is None:
        print(f"Database file already exists at {full_path}, skipping download", file=sys.stderr)
        return full_path
    
    # Convert the Google Drive view URL to a direct download URL
    file_id = "1VkzOs-x1Hepee2TbOkmuYfRWo77Q3Thn"  # Extracted from the user's URL
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    print(f"Downloading database file from Google Drive...", file=sys.stderr)
    
    try:
        # For large files, Google might show a confirmation page
        # This handles both small and large files
        session = requests.Session()
        response = session.get(download_url, stream=True)
        
        # Check if there's a download warning (for large files)
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                download_url = f"{download_url}&confirm={value}"
                response = session.get(download_url, stream=True)
                break
        
        # Save the file
        with open(full_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192): 
                if chunk:
                    f.write(chunk)
        
        print(f"Database file downloaded successfully to {full_path}", file=sys.stderr)
        
        # Run create indexes
        import create_indexes
        create_indexes.create_indexes(full_path)
        
        return full_path
    except Exception as e:
        print(f"ERROR downloading database: {str(e)}", file=sys.stderr)
        raise

# Call download function immediately at module import time
print("Starting database download process at application startup...", file=sys.stderr)
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
    # Download already happened at module import time
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)