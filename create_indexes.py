import sqlite3

def create_indexes(db_path='university_grades.db'):
    """Create indexes on the specified database file"""
    print(f"Creating indexes on {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create indexes on commonly filtered columns
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_university ON grades(university);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_term ON grades(term);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_year ON grades(year);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_subject ON grades(subject);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_catalog_number ON grades(\"Catalog Number\");")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_instructor ON grades(instructor);")

    conn.commit()
    conn.close()
    print("Indexes created successfully!")

# This allows the script to be run directly or imported as a module
if __name__ == "__main__":
    create_indexes()