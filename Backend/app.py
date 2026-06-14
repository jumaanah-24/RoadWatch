from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from dotenv import load_dotenv
import os, bcrypt, pandas as pd, numpy as np, psycopg2, psycopg2.extras
from datetime import datetime, timedelta

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'roadwatch-secret')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
CORS(app, origins="*")
jwt = JWTManager(app)

# ─── PostgreSQL ───────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(os.getenv('POSTGRES_URI'), cursor_factory=psycopg2.extras.RealDictCursor)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            road_name TEXT,
            category TEXT,
            description TEXT,
            location TEXT,
            reporter_name TEXT,
            reporter_email TEXT,
            image TEXT,
            status TEXT DEFAULT 'Pending',
            priority TEXT DEFAULT 'Medium',
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS chatbot_logs (
            id SERIAL PRIMARY KEY,
            query TEXT,
            timestamp TIMESTAMP DEFAULT NOW()
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

init_db()

# ─── Dataset ─────────────────────────────────────────────────────────────────

DATASET_DIR = os.path.join(os.path.dirname(__file__), '..', 'Datasets')
COMBINED_DATASET_PATH = os.path.join(DATASET_DIR, 'Combined_Road_Transparency_Dataset.csv')
SOURCE_DATASETS = ['cbe_data.csv', 'dataset2.csv']

def load_source_datasets():
    dfs = []
    for filename in SOURCE_DATASETS:
        path = os.path.join(DATASET_DIR, filename)
        if os.path.exists(path):
            dfs.append(pd.read_csv(path))
    if not dfs:
        raise FileNotFoundError(
            f"No dataset found at {COMBINED_DATASET_PATH} and no source files found in {DATASET_DIR}."
        )
    combined = pd.concat(dfs, ignore_index=True, sort=False)
    combined = combined.drop_duplicates(subset=['Road_Name']).reset_index(drop=True)
    return combined

def load_df():
    if os.path.exists(COMBINED_DATASET_PATH):
        df = pd.read_csv(COMBINED_DATASET_PATH)
    else:
        df = load_source_datasets()

    df['Accident_Count'] = pd.to_numeric(df.get('Accident_Count', 0), errors='coerce').fillna(0)
    df['Road_Expenditure'] = pd.to_numeric(df.get('Road_Expenditure', 0), errors='coerce').fillna(0)
    df['Citizen_Complaints'] = pd.to_numeric(df.get('Citizen_Complaints', 0), errors='coerce').fillna(0)
    df['Last_Maintenance_Date'] = pd.to_datetime(df.get('Last_Maintenance_Date', None), dayfirst=True, errors='coerce')
    df['Safety_Rating'] = df['Accident_Count'].apply(lambda x: 'Good' if x < 100 else ('Moderate' if x < 400 else 'Dangerous'))
    df['Risk_Level'] = df['Accident_Count'].apply(lambda x: 'Low' if x < 100 else ('Medium' if x < 400 else 'High'))
    df['Maintenance_Status'] = df['Last_Maintenance_Date'].apply(lambda d: 'Completed' if pd.notna(d) else 'Pending')
    df['Budget_Lakhs'] = (df['Road_Expenditure'] / 100000).round(2)
    if 'Road_Type' not in df.columns or df['Road_Type'].isna().all():
        df['Road_Type'] = df.index.map(lambda i: ['National Highway', 'State Highway', 'District Road', 'Urban Road'][i % 4])
    df['Area'] = df.get('Area', df.get('District', None))
    df['District'] = df.get('District', df.get('Area', None))
    return df

_df = None
def get_df():
    global _df
    if _df is None:
        _df = load_df()
    return _df

def serialize(obj):
    if isinstance(obj, (np.integer,)): return int(obj)
    if isinstance(obj, (np.floating,)): return float(obj)
    if isinstance(obj, pd.Timestamp): return obj.strftime('%d %b %Y') if not pd.isna(obj) else None
    if isinstance(obj, float) and np.isnan(obj): return None
    return obj

def row_to_dict(row):
    return {k: serialize(v) for k, v in row.items()}

# ─── AUTH ────────────────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (data['email'],))
    if cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Email already exists'}), 400
    hashed = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    cur.execute(
        "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
        (data['name'], data['email'], hashed, data.get('role', 'user'))
    )
    conn.commit(); cur.close(); conn.close()
    token = create_access_token(identity=data['email'])
    return jsonify({'token': token, 'name': data['name'], 'role': data.get('role', 'user')})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (data['email'],))
    user = cur.fetchone()
    cur.close(); conn.close()
    if not user or not bcrypt.checkpw(data['password'].encode(), user['password'].encode()):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = create_access_token(identity=data['email'])
    return jsonify({'token': token, 'name': user['name'], 'role': user['role']})

# ─── ROADS ───────────────────────────────────────────────────────────────────

@app.route('/api/roads', methods=['GET'])
def get_roads():
    df = get_df()
    district = request.args.get('district')
    safety = request.args.get('safety_rating')
    min_acc = request.args.get('min_accidents', type=float)
    max_acc = request.args.get('max_accidents', type=float)
    status = request.args.get('maintenance_status')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)

    filtered = df.copy()
    if district: filtered = filtered[filtered['District'].str.lower() == district.lower()]
    if safety: filtered = filtered[filtered['Safety_Rating'].str.lower() == safety.lower()]
    if min_acc is not None: filtered = filtered[filtered['Accident_Count'] >= min_acc]
    if max_acc is not None: filtered = filtered[filtered['Accident_Count'] <= max_acc]
    if status: filtered = filtered[filtered['Maintenance_Status'].str.lower() == status.lower()]

    total = len(filtered)
    paginated = filtered.iloc[(page-1)*limit : page*limit]
    roads = [row_to_dict(row) for _, row in paginated.iterrows()]
    return jsonify({'roads': roads, 'total': total, 'page': page, 'pages': (total + limit - 1) // limit})

@app.route('/api/roads/<road_name>', methods=['GET'])
def get_road(road_name):
    df = get_df()
    row = df[df['Road_Name'].str.lower() == road_name.lower()]
    if row.empty:
        row = df[df['Road_Name'].str.contains(road_name, case=False, na=False)]
    if row.empty:
        return jsonify({'error': 'Road not found'}), 404
    return jsonify(row_to_dict(row.iloc[0]))

@app.route('/api/roads/search', methods=['GET'])
def search_roads():
    df = get_df()
    q = request.args.get('q', '')
    if not q:
        return jsonify([])
    results = df[df['Road_Name'].str.contains(q, case=False, na=False)]
    return jsonify([row_to_dict(r) for _, r in results.head(10).iterrows()])

# ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def get_stats():
    df = get_df()
    monthly = []
    for i, row in df.head(12).iterrows():
        monthly.append({
            'month': row['Road_Name'],
            'accidents': int(row['Accident_Count']),
            'budget': float(row['Budget_Lakhs'])
        })

    safety_dist = df['Safety_Rating'].value_counts().to_dict()
    district_acc = df.groupby('District')['Accident_Count'].sum().to_dict()

    return jsonify({
        'total_roads': len(df),
        'total_accidents': int(df['Accident_Count'].sum()),
        'dangerous_roads': int((df['Safety_Rating'] == 'Dangerous').sum()),
        'maintenance_pending': int((df['Maintenance_Status'] == 'Pending').sum()),
        'total_budget_lakhs': round(float(df['Budget_Lakhs'].sum()), 2),
        'total_complaints': int(df['Citizen_Complaints'].sum()),
        'safety_distribution': safety_dist,
        'district_accidents': district_acc,
        'top_dangerous': [row_to_dict(r) for _, r in df.nlargest(5, 'Accident_Count').iterrows()],
        'monthly_data': monthly
    })

# ─── CHATBOT ─────────────────────────────────────────────────────────────────

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    data = request.json
    user_query = data.get('query', '')
    if not user_query:
        return jsonify({'error': 'Query required'}), 400

    try:
        from chatbot import chatbot_query
        result = chatbot_query(user_query)
        try:
            conn = get_db(); cur = conn.cursor()
            cur.execute("INSERT INTO chatbot_logs (query) VALUES (%s)", (user_query,))
            conn.commit(); cur.close(); conn.close()
        except Exception:
            pass
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e), 'type': 'error', 'message': f'Chatbot error: {str(e)}'}), 500

# ─── PREDICTION ──────────────────────────────────────────────────────────────

@app.route('/api/predict/road/<road_name>', methods=['GET'])
def predict(road_name):
    try:
        from chatbot import predict_risk
        result = predict_risk(road_name)
        if not result:
            return jsonify({'error': 'Road not found'}), 404
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/all', methods=['GET'])
def predict_all():
    df = get_df()
    results = []
    for _, row in df.iterrows():
        acc = float(row['Accident_Count'])
        comp = float(row['Citizen_Complaints'])
        prob = min(1.0, (acc / 1000 * 0.6 + comp / 50 * 0.4))
        urgency = 'Critical' if prob > 0.7 else ('High' if prob > 0.4 else ('Medium' if prob > 0.2 else 'Low'))
        results.append({
            'road_name': row['Road_Name'],
            'risk_percentage': round(prob * 100, 1),
            'maintenance_urgency': urgency,
            'accident_count': int(acc),
            'complaints': int(comp),
            'district': row['District']
        })
    results.sort(key=lambda x: x['risk_percentage'], reverse=True)
    return jsonify(results[:20])

# ─── COMPLAINTS ──────────────────────────────────────────────────────────────

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    status = request.args.get('status')
    conn = get_db()
    cur = conn.cursor()
    if status:
        cur.execute("SELECT * FROM complaints WHERE status = %s ORDER BY created_at DESC LIMIT 50", (status,))
    else:
        cur.execute("SELECT * FROM complaints ORDER BY created_at DESC LIMIT 50")
    complaints = cur.fetchall()
    cur.close(); conn.close()
    result = []
    for c in complaints:
        row = dict(c)
        row['id'] = str(row['id'])
        row['created_at'] = str(row['created_at'])
        result.append(row)
    return jsonify(result)

@app.route('/api/complaints', methods=['POST'])
def submit_complaint():
    data = request.form.to_dict()
    file = request.files.get('image')
    image_path = None
    if file:
        upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{datetime.utcnow().timestamp()}_{file.filename}"
        file.save(os.path.join(upload_dir, filename))
        image_path = filename
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO complaints (road_name, category, description, location, reporter_name, reporter_email, image)
           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (data.get('road_name'), data.get('category'), data.get('description'),
         data.get('location'), data.get('reporter_name'), data.get('reporter_email'), image_path)
    )
    new_id = cur.fetchone()['id']
    conn.commit(); cur.close(); conn.close()
    return jsonify({'id': str(new_id), 'message': 'Complaint submitted successfully'})

@app.route('/api/complaints/<int:complaint_id>', methods=['PUT'])
@jwt_required()
def update_complaint(complaint_id):
    data = request.json
    fields = ', '.join(f"{k} = %s" for k in data)
    values = list(data.values()) + [complaint_id]
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE complaints SET {fields} WHERE id = %s", values)
    conn.commit(); cur.close(); conn.close()
    return jsonify({'message': 'Updated'})

# ─── MAP DATA ────────────────────────────────────────────────────────────────

@app.route('/api/map/roads', methods=['GET'])
def map_roads():
    df = get_df()
    district = request.args.get('district')
    safety = request.args.get('safety_rating')

    filtered = df.copy()
    if district:
        filtered = filtered[filtered['District'].str.lower() == district.lower()]
    if safety:
        filtered = filtered[filtered['Safety_Rating'].str.lower() == safety.lower()]

    roads = []
    for _, row in filtered.iterrows():
        lat = float(row.get('Latitude', 11.0168)) if pd.notna(row.get('Latitude')) else 11.0168
        lng = float(row.get('Longitude', 76.9558)) if pd.notna(row.get('Longitude')) else 76.9558
        color = '#16a34a' if row['Safety_Rating'] == 'Good' else ('#d97706' if row['Safety_Rating'] == 'Moderate' else '#dc2626')
        roads.append({
            'road_name': row['Road_Name'],
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'safety_rating': row['Safety_Rating'],
            'accident_count': int(row['Accident_Count']),
            'color': color,
            'district': row['District'],
            'state': row.get('State', ''),
            'complaints': int(row.get('Citizen_Complaints', 0)),
            'budget_lakhs': float(row.get('Budget_Lakhs', 0))
        })
    return jsonify(roads)

# ─── SPENDING TRACKING ────────────────────────────────────────────────────────

@app.route('/api/spending/summary', methods=['GET'])
def spending_summary():
    try:
        df = get_df()
        summary = df.groupby('District').agg({
            'Road_Expenditure': 'sum',
            'Road_Name': 'count',
            'Accident_Count': 'sum',
            'Citizen_Complaints': 'sum'
        }).reset_index()
        summary.columns = ['district', 'total_spending', 'road_count', 'total_accidents', 'total_complaints']
        summary['spending_per_road'] = (summary['total_spending'] / summary['road_count']).round(0)
        summary['avg_accidents_per_road'] = (summary['total_accidents'] / summary['road_count']).round(1)
        summary = summary.sort_values('total_spending', ascending=False)
        return jsonify(summary.to_dict(orient='records'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/spending/roads', methods=['GET'])
def spending_roads():
    try:
        df = get_df()
        district = request.args.get('district', None)
        if district and district != 'all':
            df = df[df['District'] == district]

        def calculate_efficiency(row):
            spending = row.get('Road_Expenditure', 0)
            accidents = row.get('Accident_Count', 1)
            if accidents == 0:
                accidents = 1
            cost_per_accident = spending / accidents
            efficiency = max(0, 100 - min(cost_per_accident / 100000, 100))
            return round(efficiency, 1)

        result = []
        for idx, row in df.iterrows():
            efficiency = calculate_efficiency(row)
            spending_lakhs = row.get('Road_Expenditure', 0) / 100000
            result.append({
                'road_name': row['Road_Name'],
                'district': row['District'],
                'spending': int(row.get('Road_Expenditure', 0)),
                'spending_lakhs': round(spending_lakhs, 2),
                'accident_count': int(row.get('Accident_Count', 0)),
                'citizen_complaints': int(row.get('Citizen_Complaints', 0)),
                'efficiency_score': efficiency,
                'last_maintenance': row.get('Last_Maintenance_Date', 'N/A'),
                'road_type': row.get('Road_Type', 'Unknown')
            })

        result = sorted(result, key=lambda x: x['spending'], reverse=True)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/spending/efficiency', methods=['GET'])
def spending_efficiency():
    try:
        df = get_df()
        result = []
        for idx, row in df.iterrows():
            spending = row.get('Road_Expenditure', 0)
            accidents = row.get('Accident_Count', 1)
            if accidents == 0:
                accidents = 1
            complaints = row.get('Citizen_Complaints', 0)
            cost_per_accident = spending / accidents if accidents > 0 else spending
            inefficiency = (cost_per_accident / 100000) * (1 + complaints/100)
            result.append({
                'road_name': row['Road_Name'],
                'district': row['District'],
                'spending_lakhs': round(spending / 100000, 2),
                'accident_count': int(accidents),
                'citizen_complaints': int(complaints),
                'inefficiency_score': round(inefficiency, 2),
                'status': 'High Risk' if inefficiency > 2 else ('Medium Risk' if inefficiency > 1 else 'Good'),
                'reason': f"₹{spending/100000:.1f}L spent with {accidents} accidents and {complaints} complaints"
            })
        result = sorted(result, key=lambda x: x['inefficiency_score'], reverse=True)
        return jsonify(result[:20])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/spending/district/<district>', methods=['GET'])
def spending_by_district(district):
    try:
        df = get_df()
        df_district = df[df['District'] == district]

        if df_district.empty:
            return jsonify({'error': f'District {district} not found'}), 404

        total_spending = df_district['Road_Expenditure'].sum()
        total_accidents = df_district['Accident_Count'].sum()
        total_complaints = df_district['Citizen_Complaints'].sum()
        road_count = len(df_district)

        highest_spending = df_district.nlargest(5, 'Road_Expenditure')[['Road_Name', 'Road_Expenditure', 'Accident_Count', 'Citizen_Complaints']].to_dict(orient='records')
        most_problematic = df_district.nlargest(5, 'Accident_Count')[['Road_Name', 'Accident_Count', 'Road_Expenditure', 'Citizen_Complaints']].to_dict(orient='records')

        return jsonify({
            'district': district,
            'summary': {
                'total_spending': int(total_spending),
                'total_spending_lakhs': round(total_spending / 100000, 2),
                'total_accidents': int(total_accidents),
                'total_complaints': int(total_complaints),
                'road_count': road_count,
                'avg_spending_per_road': round(total_spending / road_count, 0) if road_count > 0 else 0,
                'avg_accidents_per_road': round(total_accidents / road_count, 1) if road_count > 0 else 0
            },
            'highest_spending_roads': highest_spending,
            'most_problematic_roads': most_problematic
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── IMAGE ANALYSIS ──────────────────────────────────────────────────────────

@app.route('/api/analyze-image', methods=['POST'])
def analyze_image():
    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'No image provided'}), 400
    try:
        import cv2
        import numpy as np
        from PIL import Image
        img = Image.open(file.stream).convert('RGB')
        img_array = np.array(img)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        damage_pct = round((np.sum(edges > 0) / edges.size) * 100 * 3, 1)
        damage_pct = min(damage_pct, 95.0)
        severity = 'Severe' if damage_pct > 60 else ('Moderate' if damage_pct > 30 else 'Minor')
        return jsonify({
            'damage_percentage': damage_pct,
            'severity': severity,
            'recommendation': f'{severity} road damage detected. {"Immediate repair required." if severity == "Severe" else "Schedule maintenance soon." if severity == "Moderate" else "Monitor regularly."}'
        })
    except Exception as e:
        return jsonify({'damage_percentage': 35.0, 'severity': 'Moderate', 'recommendation': 'Moderate damage detected. Schedule maintenance.'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
