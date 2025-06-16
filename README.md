# CollegeGrades.org

**Live Site:** https://collegegrades.org

A comprehensive grade database and search platform for over 20 universities, providing transparent access to academic records from over one million classes. This project was developed to make grade distribution data easily searchable and accessible to students and faculty.

### Key Features

* **Advanced Search**: Filter grade data by university, subject, course number, instructor, year, and term.
* **Aggregate Statistics**: View summed grade distributions and dynamically calculated average GPAs for any search query.
* **Dynamic Autocomplete**: Fast autocomplete suggestions are provided for all search fields to improve user experience.
* **Interactive Data Visualization**: Grade distributions are rendered in responsive, dynamic bar charts using Chart.js.
* **Responsive and User-Friendly UI**: Features a mobile-friendly design and a persistent dark/light mode theme toggle that saves user preference in `localStorage`.

### Technical Architecture & Highlights

This project is built with a focus on performance, scalability, and user experience.

#### Backend

* **Framework & Server**: The application is a **Flask** web server with a REST API to serve grade data. [cite_start]It uses **Gunicorn** as the application server and **Nginx** as a reverse proxy.
* **Database**:
    * The application uses **SQLite** for its database, which is automatically downloaded at startup from a cloud source using `gdown`.
    * **Performance Optimization**: At startup, the entire multi-gigabyte SQLite database is loaded into an **in-memory** connection for millisecond query times.
    * **Database Indexing**: A dedicated script (`create_indexes.py`) creates indexes on all commonly filtered columns to ensure efficient querying.
* **API & Performance**:
    * The API uses **SQLAlchemy** for querying and data modeling.
    * Common API responses are cached using **Flask-Caching** to reduce database load.

#### Frontend

* **Core Technologies**: Built with vanilla **JavaScript**, **HTML5**, and **CSS** for a fast and lightweight user experience.
* **Performance**: API calls for the autocomplete search feature are **debounced** to prevent excessive network traffic and improve client-side performance.
* **Data Visualization**: Uses **Chart.js** to render dynamic and interactive charts from API data.
* **User Experience**: Improves usability by normalizing search inputs (e.g., 'UCLA' becomes 'UC Los Angeles') via a synonym dictionary and saving user theme preferences in `localStorage`.

### Local Development Setup

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    cd [repo-name]
    ```
2.  **Create a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  **Install dependencies from `requirements.txt`:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the application:**
    ```bash
    flask run
    ```
    The application will start, download the necessary database file, and be accessible at `http://127.0.0.1:5000`.

***

*For personal deployment notes, see [DEPLOYMENT.md](DEPLOYMENT.md).*
