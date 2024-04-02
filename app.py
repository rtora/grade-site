from flask import Flask, request, jsonify, send_from_directory
from sqlalchemy import create_engine, func, Float, desc
from sqlalchemy.orm import sessionmaker
from models import Base, GradeData # Ensure this matches your actual import
from flask_cors import CORS


app = Flask(__name__, static_url_path='/static')
CORS(app)  # Enable CORS for all routes

# Adjust the DATABASE_URI as needed
DATABASE_URI = 'sqlite:///university_grades.db'
engine = create_engine(DATABASE_URI)
Base.metadata.bind = engine
DBSession = sessionmaker(bind=engine)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/grades', methods=['GET'])
def get_grades():
    session = DBSession()

    # Start with a base query
    query = session.query(GradeData)

    # Apply dynamic filters based on request arguments
    for filter_field, filter_value in request.args.items():
        if hasattr(GradeData, filter_field):
            query = query.filter(getattr(GradeData, filter_field) == filter_value)

    # Specify columns to sum
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

    # Add sum operations for specified columns
    sum_operations = [func.sum(getattr(GradeData, column)).label(column) for column in columns_to_sum]
    
    # Add operation for calculating average GPA
    sum_operations.append(func.avg(GradeData.GPA).label('average_GPA'))
    
    sums_query = query.with_entities(*sum_operations)
    sums_result = sums_query.one()

    # Convert sums_result into a dictionary
    sums_dict = {column: getattr(sums_result, column) for column in columns_to_sum}
    sums_dict['average_GPA'] = getattr(sums_result, 'average_GPA')

    session.close()
    return jsonify(sums_dict)


@app.route('/autocomplete', methods=['GET'])
def autocomplete():
    session = DBSession()

    # The field being typed into
    autocomplete_field = request.args.get('autocomplete_field')

    # Dynamic filters based on what the user has already selected
    # Expected to be passed as JSON, e.g., {"university": "UC Santa Barbara", "term": "Fall"}
    selected_filters = request.args.to_dict()
    # Remove the autocomplete_field from the filters since it's not a filter but the target for autocomplete
    selected_filters.pop('autocomplete_field', None)
    search_text = selected_filters.pop('search', '')

    if not autocomplete_field or autocomplete_field not in GradeData.__table__.columns:
        session.close()
        return jsonify([])  # Invalid field for autocomplete

    # Constructing the base query
    query = session.query(getattr(GradeData, autocomplete_field)).distinct()

    # Applying selected filters dynamically
    for filter_field, filter_value in selected_filters.items():
        if hasattr(GradeData, filter_field):
            query = query.filter(getattr(GradeData, filter_field) == filter_value)

    # Apply the search text if provided
    if search_text:
        query = query.filter(getattr(GradeData, autocomplete_field).ilike(f"%{search_text}%"))
    if autocomplete_field == 'year':
        query = query.order_by(desc(getattr(GradeData, autocomplete_field)))

    # Limiting results and ensuring they are not None
    suggestions = [result[0] for result in query.limit(10).all() if result[0] is not None]
    # print("Autocomplete field:", autocomplete_field)
    # print("Selected filters:", selected_filters)
    # print("Search text:", search_text)

    session.close()
    return jsonify(suggestions)