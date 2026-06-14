import os
import pickle
import re
import numpy as np
import faiss
import pandas as pd
from sentence_transformers import SentenceTransformer

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'Models')
DATASET_DIR = os.path.join(os.path.dirname(__file__), '..', 'Datasets')
COMBINED_DATASET_PATH = os.path.join(DATASET_DIR, 'Combined_Road_Transparency_Dataset.csv')
SOURCE_DATASETS = ['cbe_data.csv', 'dataset2.csv']

_model = None
_index = None
_docs = None
_df = None
_predictor = None
_state_df = None
_exp_df = None
_district_df = None

def load_source_datasets():
    dfs = []
    for filename in SOURCE_DATASETS:
        path = os.path.join(DATASET_DIR, filename)
        if os.path.exists(path):
            dfs.append(pd.read_csv(path))
    if not dfs:
        raise FileNotFoundError(
            f"No source dataset found in {DATASET_DIR}. Expected one of: {', '.join(SOURCE_DATASETS)}"
        )
    df = pd.concat(dfs, ignore_index=True, sort=False)
    df = df.drop_duplicates(subset=['Road_Name']).reset_index(drop=True)
    return df


def normalize_dataset(df):
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


def load_dataset_df():
    if os.path.exists(COMBINED_DATASET_PATH):
        df = pd.read_csv(COMBINED_DATASET_PATH)
    else:
        df = load_source_datasets()
    return normalize_dataset(df)


def load_models():
    global _model, _index, _docs, _df, _predictor, _state_df, _exp_df, _district_df
    if _model is not None:
        return
    _model = SentenceTransformer('all-MiniLM-L6-v2')
    _index = faiss.read_index(os.path.join(MODEL_DIR, 'road_index.faiss'))
    with open(os.path.join(MODEL_DIR, 'documents.pkl'), 'rb') as f:
        _docs = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'dataframe.pkl'), 'rb') as f:
        _df = pickle.load(f)
    _df = load_dataset_df()
    with open(os.path.join(MODEL_DIR, 'predictor.pkl'), 'rb') as f:
        _predictor = pickle.load(f)
    # Load extra datasets if available
    for attr, fname in [('_state_df', 'state_accidents.pkl'), ('_exp_df', 'expenditures.pkl'), ('_district_df', 'district_accidents.pkl')]:
        path = os.path.join(MODEL_DIR, fname)
        if os.path.exists(path):
            with open(path, 'rb') as f:
                globals()[attr] = pickle.load(f)

def search_road_by_name(query):
    query_lower = query.lower()
    for _, row in _df.iterrows():
        road_name = str(row.get('Road_Name', '')).lower()
        district = str(row.get('District', '')).lower()
        state = str(row.get('State', '')).lower()
        if road_name and (road_name in query_lower or query_lower in road_name):
            return row
        if district and district in query_lower:
            return row
        if state and state in query_lower:
            return row
    nums = re.findall(r'\d+', query)
    if nums:
        for n in nums:
            match = _df[_df['Road_Name'].str.contains(f'Road_{n}$', case=False, na=False)]
            if not match.empty:
                return match.iloc[0]
    return None

# ── General road knowledge answers ──────────────────────────────────────────

GENERAL_KNOWLEDGE = {
    ('speed limit', 'speed rule', 'maximum speed', 'speed on highway', 'speed on road'): {
        'type': 'info',
        'message': (
            "Speed limits in India (as per Motor Vehicles Act):\n"
            "• National Highways: 100 km/h for cars, 80 km/h for buses/trucks\n"
            "• State Highways: 80 km/h for cars\n"
            "• Urban roads: 50 km/h\n"
            "• Near schools/hospitals: 25 km/h\n"
            "Always follow local signage as limits may vary by state."
        )
    },
    ('road sign', 'traffic sign', 'sign meaning', 'road marking'): {
        'type': 'info',
        'message': (
            "Road signs are classified into 3 types:\n"
            "• Mandatory signs (red border circle) – must be obeyed, e.g. Stop, No Entry\n"
            "• Cautionary signs (yellow triangle) – warn of hazards ahead\n"
            "• Informatory signs (blue/green rectangle) – provide guidance & directions\n"
            "Road markings: White lines = same direction traffic, Yellow lines = opposite direction."
        )
    },
    ('pothole', 'road damage', 'road repair', 'road condition', 'bad road'): {
        'type': 'info',
        'message': (
            "Potholes and road damage can be reported through:\n"
            "• National Highways: 1033 (NHAI helpline)\n"
            "• State roads: Contact your State PWD (Public Works Department)\n"
            "• Online: pgportal.gov.in or your state's grievance portal\n"
            "• This app: Use the Complaints section to report road issues directly.\n"
            "Potholes are mainly caused by water seepage, heavy traffic load, and poor drainage."
        )
    },
    ('road accident', 'accident cause', 'accident prevention', 'avoid accident', 'accident reason'): {
        'type': 'info',
        'message': (
            "Top causes of road accidents:\n"
            "• Over-speeding (most common cause)\n"
            "• Drunk driving\n"
            "• Distracted driving (mobile phone use)\n"
            "• Not wearing seatbelt/helmet\n"
            "• Poor road conditions and potholes\n"
            "• Overtaking on blind curves\n\n"
            "Prevention tips: Follow speed limits, never drink and drive, wear seatbelt, avoid phone use while driving."
        )
    },
    ('first aid', 'accident help', 'road emergency', 'emergency number', 'ambulance'): {
        'type': 'info',
        'message': (
            "Emergency numbers in India:\n"
            "• Police: 100\n"
            "• Ambulance: 108\n"
            "• Fire: 101\n"
            "• National Emergency: 112\n"
            "• NHAI Road Emergency: 1033\n\n"
            "First aid at accident scene: Don't move injured persons unless in danger, call 108 immediately, keep them conscious and calm."
        )
    },
    ('road type', 'types of road', 'national highway', 'state highway', 'expressway', 'district road'): {
        'type': 'info',
        'message': (
            "Types of roads in India:\n"
            "• National Highways (NH) – Connect major cities, maintained by NHAI\n"
            "• State Highways (SH) – Connect state capitals and major towns\n"
            "• District Roads – Connect districts and talukas\n"
            "• Urban Roads – City roads maintained by municipal bodies\n"
            "• Expressways – High-speed limited-access roads (e.g. Mumbai-Pune)\n"
            "• Rural Roads – Built under PMGSY scheme for village connectivity"
        )
    },
    ('road construction', 'how road is made', 'road material', 'asphalt', 'bitumen', 'concrete road'): {
        'type': 'info',
        'message': (
            "Road construction layers (from bottom to top):\n"
            "1. Subgrade – Natural soil, compacted\n"
            "2. Sub-base – Granular material for drainage\n"
            "3. Base course – Crushed stone/aggregate\n"
            "4. Binder course – Asphalt/bitumen mix\n"
            "5. Surface course – Smooth wearing layer\n\n"
            "Materials: Bituminous (asphalt) roads are most common. Concrete roads are more durable but costlier."
        )
    },
    ('traffic rule', 'traffic law', 'driving rule', 'motor vehicle act', 'challan', 'fine'): {
        'type': 'info',
        'message': (
            "Key traffic rules in India (Motor Vehicles Act 2019):\n"
            "• Seatbelt: Mandatory for all occupants – Fine ₹1000\n"
            "• Helmet: Mandatory for 2-wheeler riders – Fine ₹1000\n"
            "• Drunk driving: Fine ₹10,000 + imprisonment\n"
            "• Mobile phone while driving: Fine ₹5000\n"
            "• Over-speeding: Fine ₹1000–₹2000\n"
            "• Red light jumping: Fine ₹1000–₹5000\n"
            "• No valid license: Fine ₹5000"
        )
    },
    ('road safety tip', 'safe driving', 'driving tip', 'highway safety', 'night driving'): {
        'type': 'info',
        'message': (
            "Road safety tips:\n"
            "• Always wear seatbelt and helmet\n"
            "• Never exceed speed limits\n"
            "• Maintain safe following distance (3-second rule)\n"
            "• Use indicators before turning/lane change\n"
            "• Night driving: Use low beam in city, high beam on empty highways\n"
            "• Take breaks every 2 hours on long drives\n"
            "• Check tyre pressure and brakes before long trips\n"
            "• Never drive under influence of alcohol or drugs"
        )
    },
    ('road budget', 'road fund', 'road expenditure', 'road spending', 'infrastructure budget'): {
        'type': 'info',
        'message': (
            "Road infrastructure funding in India:\n"
            "• Central Road Fund (CRF) – Funded by fuel cess\n"
            "• NHAI raises funds through bonds and tolls\n"
            "• State PWDs get budget from state finance\n"
            "• PMGSY – Pradhan Mantri Gram Sadak Yojana for rural roads\n\n"
            "You can also ask me about specific road expenditure data from our dataset!"
        )
    },
    ('toll', 'toll tax', 'toll plaza', 'fastag'): {
        'type': 'info',
        'message': (
            "Toll and FASTag information:\n"
            "• FASTag is mandatory for all 4-wheelers in India since Feb 2021\n"
            "• Without FASTag: Pay double toll at cash lanes\n"
            "• FASTag uses RFID technology for automatic deduction\n"
            "• Available at banks, NHAI offices, and online\n"
            "• Toll rates vary by vehicle type and highway\n"
            "• Monthly/annual passes available for frequent users"
        )
    },
    ('maintenance', 'road maintenance', 'when road maintained', 'repair schedule'): {
        'type': 'info',
        'message': (
            "Road maintenance types:\n"
            "• Routine maintenance – Pothole filling, cleaning, marking (monthly)\n"
            "• Periodic maintenance – Resurfacing, overlay (every 5-7 years)\n"
            "• Special repairs – After floods, accidents, or major damage\n"
            "• Reconstruction – Complete rebuilding (every 15-20 years)\n\n"
            "You can ask me about maintenance status of specific roads in our dataset!"
        )
    },
}

def match_general_knowledge(query_lower):
    for keywords, response in GENERAL_KNOWLEDGE.items():
        if any(kw in query_lower for kw in keywords):
            return response
    return None

# ── Dataset-specific handlers ────────────────────────────────────────────────

def handle_state_query(query_lower):
    if _state_df is None:
        return None
    # State-level accident queries
    if any(w in query_lower for w in ['state', 'india accident', 'national accident', 'which state', 'state accident', 'most accident state']):
        top = _state_df.nlargest(5, 'Road_Accident_Cases')[['Region', 'Road_Accident_Cases', 'Road_Deaths', 'Road_Injured']]
        rows = top.to_dict('records')
        return {
            'type': 'table',
            'message': 'Top 5 states/cities by road accident cases (National Data):',
            'columns': ['Region', 'Accident Cases', 'Deaths', 'Injured'],
            'rows': [[r['Region'], int(r['Road_Accident_Cases']), int(r['Road_Deaths']), int(r['Road_Injured'])] for r in rows]
        }
    # Specific state/city lookup
    for _, row in _state_df.iterrows():
        region = str(row['Region']).lower()
        if region in query_lower or any(w in region for w in query_lower.split() if len(w) > 3):
            return {
                'type': 'info',
                'message': (
                    f"Road accident data for {row['Region']}:\n"
                    f"• Road Accident Cases: {int(row['Road_Accident_Cases']):,}\n"
                    f"• Persons Injured: {int(row['Road_Injured']):,}\n"
                    f"• Persons Killed: {int(row['Road_Deaths']):,}\n"
                    f"• Total Traffic Accident Cases: {int(row.get('Total_Accident_Cases', 0)):,}"
                )
            }
    return None

def handle_expenditure_query(query_lower):
    if _exp_df is None:
        return None
    if not any(w in query_lower for w in ['county', 'expenditure', 'spending', 'construction cost', 'road cost', 'annual']):
        return None
    # Top spending counties
    latest_year = _exp_df['CalendarYear'].max()
    latest = _exp_df[_exp_df['CalendarYear'] == latest_year]
    top = latest.nlargest(5, 'Total')[['CountyName', 'Construction', 'Maintenance', 'Total']]
    rows = top.to_dict('records')
    return {
        'type': 'table',
        'message': f'Top 5 counties by road expenditure ({int(latest_year)}):',
        'columns': ['County', 'Construction ($)', 'Maintenance ($)', 'Total ($)'],
        'rows': [[r['CountyName'], f"${int(r['Construction']):,}", f"${int(r['Maintenance']):,}", f"${int(r['Total']):,}"] for r in rows]
    }

def handle_district_query(query_lower):
    if _district_df is None:
        return None
    if not any(w in query_lower for w in ['tamil', 'district accident', 'tamilnadu', 'tamil nadu', 'chennai', 'coimbatore accident', 'madurai accident']):
        return None
    # Specific district lookup
    for _, row in _district_df.iterrows():
        district = str(row['District']).lower()
        if any(w in district for w in query_lower.split() if len(w) > 3):
            return {
                'type': 'info',
                'message': (
                    f"Road accident data for {row['District']} (Tamil Nadu, 2018):\n"
                    f"• Total Accidents: {int(row['Accident_Cases']):,}\n"
                    f"• Persons Injured: {int(row['Injured']):,}\n"
                    f"• Persons Killed: {int(row['Killed']):,}"
                )
            }
    # Top districts
    top = _district_df.nlargest(5, 'Accident_Cases')[['District', 'Accident_Cases', 'Injured', 'Killed']]
    rows = top.to_dict('records')
    return {
        'type': 'table',
        'message': 'Top 5 Tamil Nadu districts by road accidents (2018):',
        'columns': ['District', 'Accidents', 'Injured', 'Killed'],
        'rows': [[r['District'], int(r['Accident_Cases']), int(r['Injured']), int(r['Killed'])] for r in rows]
    }

# ── Main chatbot entry point ─────────────────────────────────────────────────

def chatbot_query(user_query):
    load_models()
    query_lower = user_query.lower()

    # 1. General road knowledge
    general = match_general_knowledge(query_lower)
    if general:
        return general

    # 2. Dangerous / high accident roads
    if any(w in query_lower for w in ['highest accident', 'most accident', 'dangerous road', 'unsafe road', 'worst road']):
        top = _df.nlargest(5, 'Accident_Count')[['Road_Name', 'District', 'Accident_Count', 'Safety_Rating', 'Risk_Level']]
        return {'type': 'list', 'message': 'Top 5 most dangerous roads by accident count:', 'roads': top.to_dict('records')}

    # 3. Pending maintenance
    if any(w in query_lower for w in ['pending maintenance', 'delayed maintenance', 'maintenance pending', 'not maintained']):
        pending = _df[_df['Maintenance_Status'] == 'Pending'][['Road_Name', 'District', 'Accident_Count', 'Citizen_Complaints']]
        return {'type': 'list', 'message': f'Roads with pending maintenance ({len(pending)} roads):', 'roads': pending.head(5).to_dict('records')}

    # 4. Complaints
    if any(w in query_lower for w in ['complaint', 'complaints', 'grievance']):
        if any(w in query_lower for w in ['more than', 'greater than', 'above']):
            nums = re.findall(r'\d+', query_lower)
            threshold = int(nums[0]) if nums else 20
            filtered = _df[_df['Citizen_Complaints'] > threshold][['Road_Name', 'District', 'Citizen_Complaints', 'Safety_Rating']]
            return {'type': 'list', 'message': f'Roads with more than {threshold} complaints:', 'roads': filtered.head(10).to_dict('records')}
        top = _df.nlargest(5, 'Citizen_Complaints')[['Road_Name', 'District', 'Citizen_Complaints', 'Safety_Rating']]
        return {'type': 'list', 'message': 'Roads with highest citizen complaints:', 'roads': top.to_dict('records')}

    # 5. Stats / summary
    if any(w in query_lower for w in ['total', 'how many', 'count', 'statistics', 'stats', 'summary', 'overview']):
        return {
            'type': 'stats',
            'message': 'Here are the overall road statistics:',
            'stats': {
                'total_roads': len(_df),
                'total_accidents': int(_df['Accident_Count'].sum()),
                'dangerous_roads': int((_df['Safety_Rating'] == 'Dangerous').sum()),
                'pending_maintenance': int((_df['Maintenance_Status'] == 'Pending').sum()),
                'total_budget_lakhs': round(_df['Budget_Lakhs'].sum(), 2),
                'total_complaints': int(_df['Citizen_Complaints'].sum())
            }
        }

    # 6. Budget / expenditure (local dataset)
    if any(w in query_lower for w in ['budget', 'expenditure', 'spent', 'money', 'cost', 'fund']):
        exp_result = handle_expenditure_query(query_lower)
        if exp_result:
            return exp_result
        top = _df.nlargest(5, 'Budget_Lakhs')[['Road_Name', 'District', 'Budget_Lakhs', 'Contractor']]
        return {
            'type': 'list',
            'message': f'Total budget across all roads: ₹{_df["Budget_Lakhs"].sum():.2f} Lakhs. Top 5 by expenditure:',
            'roads': top.to_dict('records')
        }

    # 7. Good / safe roads
    if any(w in query_lower for w in ['good road', 'safe road', 'best road', 'low accident']):
        good = _df[_df['Safety_Rating'] == 'Good'][['Road_Name', 'District', 'Accident_Count', 'Safety_Rating']].head(5)
        return {'type': 'list', 'message': 'Roads with Good safety rating (low accidents):', 'roads': good.to_dict('records')}

    # 8. State-level accident data
    state_result = handle_state_query(query_lower)
    if state_result:
        return state_result

    # 9. Tamil Nadu district data
    district_result = handle_district_query(query_lower)
    if district_result:
        return district_result

    # 9a. List roads in a district or state mentioned (dataset-driven)
    if any(w in query_lower for w in ['which roads', 'roads in', 'list roads in', 'show roads in', 'roads of']):
        m = re.search(r'roads? in ([a-zA-Z \-]+)', query_lower)
        if m:
            place = m.group(1).strip()
            matches = _df[_df['District'].str.contains(place, case=False, na=False)]
            if matches.empty:
                matches = _df[_df['State'].str.contains(place, case=False, na=False)]
            if not matches.empty:
                return {
                    'type': 'list',
                    'message': f'Roads in {place.title()}:',
                    'roads': matches[['Road_Name', 'District', 'Accident_Count', 'Citizen_Complaints', 'Safety_Rating']].to_dict('records')
                }
        # fallback: check known districts/states mentioned anywhere
        for d in pd.unique(_df['District'].dropna()):
            if str(d).lower() in query_lower:
                matches = _df[_df['District'] == d]
                return {
                    'type': 'list',
                    'message': f'Roads in {d}:',
                    'roads': matches[['Road_Name', 'District', 'Accident_Count', 'Citizen_Complaints', 'Safety_Rating']].to_dict('records')
                }
        for s in pd.unique(_df['State'].dropna()):
            if str(s).lower() in query_lower:
                matches = _df[_df['State'] == s]
                return {
                    'type': 'list',
                    'message': f'Roads in {s}:',
                    'roads': matches[['Road_Name', 'District', 'Accident_Count', 'Citizen_Complaints', 'Safety_Rating']].to_dict('records')
                }

    # 10. Specific road lookup
    road_row = search_road_by_name(user_query)
    if road_row is not None:
        return {
            'type': 'road_detail',
            'message': f"Here are the details for {road_row['Road_Name']}:",
            'road': {
                'Road_Name': road_row['Road_Name'],
                'District': road_row['District'],
                'Area': road_row['Area'],
                'Accident_Count': int(road_row['Accident_Count']),
                'Safety_Rating': road_row['Safety_Rating'],
                'Last_Repair': road_row['Last_Maintenance_Date'].strftime('%d %b %Y') if pd.notna(road_row['Last_Maintenance_Date']) else 'Unknown',
                'Maintenance_Status': road_row['Maintenance_Status'],
                'Budget_Lakhs': float(road_row['Budget_Lakhs']),
                'Contractor': road_row['Contractor'],
                'Citizen_Complaints': int(road_row['Citizen_Complaints']),
                'Risk_Level': road_row['Risk_Level'],
                'Road_Type': road_row['Road_Type']
            }
        }

    # 11. Semantic search fallback (map FAISS hits to docs and then to dataset rows)
    try:
        query_vec = _model.encode([user_query]).astype('float32')
        D, I = _index.search(query_vec, 5)
        results = []
        seen = set()
        for hit_idx in I[0]:
            if hit_idx < len(_docs):
                doc = _docs[hit_idx]
                m = re.search(r'Road Name:\s*([^\.\n]+)', doc, re.IGNORECASE)
                road_name = m.group(1).strip() if m else None
                if not road_name:
                    continue
                match = _df[_df['Road_Name'].str.contains(re.escape(road_name), case=False, na=False)]
                if match.empty:
                    match = _df[_df['Road_Name'].str.lower() == road_name.lower()]
                if match.empty:
                    continue
                row = match.iloc[0]
                rn = row['Road_Name']
                if rn in seen:
                    continue
                seen.add(rn)
                results.append({
                    'Road_Name': rn,
                    'District': row['District'],
                    'Accident_Count': int(row['Accident_Count']),
                    'Safety_Rating': row['Safety_Rating'],
                    'Risk_Level': row['Risk_Level']
                })
        if results:
            return {'type': 'search_results', 'message': 'Here are the most relevant roads for your query:', 'roads': results}
    except Exception:
        pass

    return {
        'type': 'info',
        'message': (
            "I can answer questions about:\n"
            "• Specific roads (e.g. 'Tell me about Road_5')\n"
            "• Dangerous or safe roads\n"
            "• Maintenance status and complaints\n"
            "• Road safety tips, traffic rules, speed limits\n"
            "• Accident statistics (India, Tamil Nadu districts)\n"
            "• Road types, construction, potholes\n"
            "• Emergency numbers and first aid\n"
            "Try asking something like: 'What are the speed limits?' or 'Which roads are dangerous?'"
        )
    }

def predict_risk(road_name):
    load_models()
    row = _df[_df['Road_Name'].str.lower() == road_name.lower()]
    if row.empty:
        return None
    row = row.iloc[0]
    features = np.array([[row['Accident_Count'], row['Citizen_Complaints'], row['Budget_Lakhs']]])
    prob = _predictor.predict_proba(features)[0][1]
    urgency = 'Critical' if prob > 0.7 else ('High' if prob > 0.4 else ('Medium' if prob > 0.2 else 'Low'))
    return {
        'road_name': road_name,
        'risk_percentage': round(prob * 100, 1),
        'maintenance_urgency': urgency,
        'accident_count': int(row['Accident_Count']),
        'complaints': int(row['Citizen_Complaints'])
    }
