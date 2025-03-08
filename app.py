import sqlite3
from flask import Flask, request, jsonify, send_from_directory
from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from models import Base, GradeData
from flask_cors import CORS
from flask_caching import Cache
import os
from pathlib import Path

app = Flask(__name__, static_url_path='/static')
CORS(app, resources={r"/*": {"origins": [
    "http://collegegrades.org",
    "https://collegegrades.org",
    "https://www.collegegrades.org",
    "http://www.collegegrades.org",
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
    disk_conn = sqlite3.connect('university_grades.db')
    
    # Copy disk database to memory
    disk_conn.backup(mem_conn)
    disk_conn.close()
    
    # Optimize SQLite settings for read-only operations
    mem_conn.execute("PRAGMA cache_size = -32000;")  # 32MB cache
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
    # Run create_indexes.py first to ensure indexes exist
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)