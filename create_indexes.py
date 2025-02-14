import sqlite3

# Connect to your existing SQLite database
conn = sqlite3.connect('university_grades.db')
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