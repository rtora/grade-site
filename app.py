from flask import Flask, request, jsonify
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, load_only
from models import Base, GradeData, db  # Ensure this matches your actual import

app = Flask(__name__)

# Adjust the DATABASE_URI as needed
DATABASE_URI = 'sqlite:///university_grades.db'
engine = create_engine(DATABASE_URI)
Base.metadata.bind = engine
DBSession = sessionmaker(bind=engine)

@app.route('/api/grades', methods=['GET'])
def get_grades():
    session = db.session
    university = request.args.get('university')

    # Apply filters dynamically, excluding specific university logic for now
    query = GradeData.query
    for param in ['instructor', 'year', 'catalog_number', 'subject', 'term', 'title']:
        if param_value := request.args.get(param):
            query = query.filter(getattr(GradeData, param) == param_value)
    
    # When university is not specified, still fetch all records but flag for special handling
    exclude_universities = university is None

    records = query.all()

    # Prepare results, aggregating float columns and calculating GPA accordingly
    results = []
    for record in records:
        if exclude_universities and record.university in ["Cal State East Bay", "UC San Diego"]:
            continue  # Skip GPA calculation for these records when university not specified
        
        data = {
            'instructor': record.instructor,
            'year': record.year,
            'catalog_number': record.catalog_number,
            'subject': record.subject,
            'term': record.term,
            'title': record.title,
            # Summed float columns and GPA calculation will be added here
        }
        
        if university != "Cal State East Bay":
            data['GPA'] = calculate_gpa(record)
            # For UC San Diego, or when university not specified, proceed with normal GPA calculation

        # For summing float columns, assuming a function or method to do so:
        data.update(sum_float_columns(record))

        results.append(data)

    return jsonify(results)

def calculate_gpa(record):
    # Define the value of each grade
    grade_values = {
        'A_plus': 4.0,
        'A': 4.0,
        'A_minus': 3.7,
        'B_plus': 3.3,
        'B': 3.0,
        'B_minus': 2.7,
        'C_plus': 2.3,
        'C': 2.0,
        'C_minus': 1.7,
        'D_plus': 1.3,
        'D': 1.0,
        'D_minus': 0.7,
        'F': 0.0,
    }
    
    # Calculate total graded attempts and weighted sum
    total_attempts, weighted_sum = 0, 0
    for grade, value in grade_values.items():
        count = getattr(record, grade, 0)
        total_attempts += count
        weighted_sum += count * value
    
    # Calculate GPA
    if total_attempts > 0:
        gpa = weighted_sum / total_attempts
        return round(gpa, 2)  # Rounding to 2 decimal places for simplicity
    else:
        return None  # Indicate that GPA calculation was not possible due to lack of data

# Note: Ensure that the attributes in your GradeData model match the keys in the grade_values dict.
# For example, 'A_plus' should match the attribute in GradeData for A+ grades count.
# Adjust the dict keys to match your model's attributes exactly.
def sum_float_columns(record):
    # List of float column names in your model, excluding 'GPA'
    float_column_names = [
        'A_plus', 'A', 'A_minus', 'B_plus', 'B', 'B_minus', 
        'C_plus', 'C', 'C_minus', 'D_plus', 'D', 'D_minus', 'F',
        'Pass', 'Not_Pass', 'Satisfactory', 'Unsatisfactory', 'Not_Satisfactory',
        'Incomplete', 'In_Progress', 'Withdrawn', 'Withdrawn_Passing', 
        'Withdrawn_Medical', 'Withdrawn_Incomplete', 'Drop', 
        'Withdrawn_from_University', 'Honors', 'No_Grade', 'Review', 'Audit', 
        'Not_Reported', 'Repeat', 'DFWU', 'Pending_Judicial_Action', 
        'Withheld', 'Report_In_Progress', 'I_RD_RP', 'wo_I_RD_RP'
    ]

    # Initialize a dictionary to hold the sum of each float column
    float_sums = {column_name: 0 for column_name in float_column_names}
    
    # Aggregate the sums for each float column
    for column_name in float_column_names:
        column_value = getattr(record, column_name, 0) if hasattr(record, column_name) else 0
        float_sums[column_name] += column_value
    
    return float_sums

if __name__ == '__main__':
    app.run(debug=True)
