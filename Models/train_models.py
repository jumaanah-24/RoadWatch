import pandas as pd
import numpy as np
import faiss
import pickle
import os
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import RandomForestClassifier
import warnings
warnings.filterwarnings('ignore')

DATASET_DIR = os.path.join(os.path.dirname(__file__), '..', 'Datasets')
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'Models')
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
            f"No combined dataset found at {COMBINED_DATASET_PATH} and no source files found in {DATASET_DIR}."
        )
    df = pd.concat(dfs, ignore_index=True, sort=False)
    df = df.drop_duplicates(subset=['Road_Name']).reset_index(drop=True)
    return df

def load_combined():
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
    df['Source'] = 'combined'
    return df

def load_state_accidents():
    """ADSI_Table_1A.2.csv - state/city level accident data"""
    df = pd.read_csv(os.path.join(DATASET_DIR, 'ADSI_Table_1A.2.csv'))
    df.columns = df.columns.str.strip()
    # Filter out total rows
    df = df[~df['State/UT/City'].str.lower().str.startswith('total', na=True)]
    df = df.rename(columns={
        'State/UT/City': 'Region',
        'Road Accidents - Cases': 'Road_Accident_Cases',
        'Road Accidents - Injured': 'Road_Injured',
        'Road Accidents - Died': 'Road_Deaths',
        'Total Traffic Accidents - Cases': 'Total_Accident_Cases',
        'Total Traffic Accidents - Injured': 'Total_Injured',
        'Total Traffic Accidents - Died': 'Total_Deaths',
    })
    df['Road_Accident_Cases'] = pd.to_numeric(df['Road_Accident_Cases'], errors='coerce').fillna(0)
    df['Road_Deaths'] = pd.to_numeric(df['Road_Deaths'], errors='coerce').fillna(0)
    df['Road_Injured'] = pd.to_numeric(df['Road_Injured'], errors='coerce').fillna(0)
    df['Source'] = 'state_accidents'
    return df

def load_expenditures():
    """Annual_County_Road_Related_Expenditures.csv or RS_Session_262_AU_412_B_ii.csv"""
    exp_path = os.path.join(DATASET_DIR, 'Annual_County_Road_Related_Expenditures.csv')
    rs_path = os.path.join(DATASET_DIR, 'RS_Session_262_AU_412_B_ii.csv')
    if os.path.exists(exp_path):
        df = pd.read_csv(exp_path)
        df.columns = df.columns.str.strip()
        df['Construction'] = pd.to_numeric(df['Construction'], errors='coerce').fillna(0)
        df['Maintenance'] = pd.to_numeric(df['Maintenance'], errors='coerce').fillna(0)
        df['Total'] = pd.to_numeric(df['Total'], errors='coerce').fillna(0)
        df['Source'] = 'expenditures'
        return df
    if os.path.exists(rs_path):
        df = pd.read_csv(rs_path)
        df.columns = df.columns.str.strip()
        df = df.rename(columns={
            'State/UT': 'CountyName',
            'Projects Received and Finalized - Cost': 'Total',
            'Year': 'CalendarYear'
        })
        df['Total'] = pd.to_numeric(df.get('Total', 0), errors='coerce').fillna(0)
        df['Construction'] = df['Total']
        df['Maintenance'] = 0
        df['CalendarYear'] = pd.to_numeric(df['CalendarYear'].astype(str).str.extract(r'(\d{4})')[0], errors='coerce').fillna(0).astype(int)
        df['Source'] = 'expenditures'
        return df
    raise FileNotFoundError(
        f"No expenditure dataset found in {DATASET_DIR}. Expected Annual_County_Road_Related_Expenditures.csv or RS_Session_262_AU_412_B_ii.csv."
    )

def load_district_accidents():
    """road_accidents_by_districts_2020.csv - Tamil Nadu districts"""
    df = pd.read_csv(os.path.join(DATASET_DIR, 'road_accidents_by_districts_2020.csv'))
    df.columns = df.columns.str.strip()
    df = df[~df['City / District'].str.lower().str.startswith('total', na=True)]
    df = df.rename(columns={
        'City / District': 'District',
        'Total Number of Accidents (2018)': 'Accident_Cases',
        'Number of Persons Injured (2018)': 'Injured',
        'Number of Persons Killed (2018)': 'Killed',
    })
    df['Accident_Cases'] = pd.to_numeric(df['Accident_Cases'], errors='coerce').fillna(0)
    df['Injured'] = pd.to_numeric(df['Injured'], errors='coerce').fillna(0)
    df['Killed'] = pd.to_numeric(df['Killed'], errors='coerce').fillna(0)
    df['Source'] = 'district_accidents'
    return df

def build_documents(main_df, state_df, exp_df, district_df):
    docs = []

    # Main road-level documents
    for _, row in main_df.iterrows():
        doc = (
            f"Road Name: {row['Road_Name']}. "
            f"District: {row['District']}. "
            f"Area: {row['Area']}. "
            f"Accident Count: {int(row['Accident_Count'])}. "
            f"Safety Rating: {row['Safety_Rating']}. "
            f"Last Repair Date: {row['Last_Maintenance_Date'].strftime('%d %b %Y') if pd.notna(row['Last_Maintenance_Date']) else 'Unknown'}. "
            f"Maintenance Status: {row['Maintenance_Status']}. "
            f"Budget Allocated: Rs {row['Budget_Lakhs']} Lakhs. "
            f"Contractor: {row['Contractor']}. "
            f"Citizen Complaints: {int(row['Citizen_Complaints'])}. "
            f"Risk Level: {row['Risk_Level']}. "
            f"Road Type: {row['Road_Type']}."
        )
        docs.append(doc)

    # State/city accident documents
    for _, row in state_df.iterrows():
        doc = (
            f"Region: {row['Region']}. "
            f"Road Accident Cases: {int(row['Road_Accident_Cases'])}. "
            f"Road Accident Deaths: {int(row['Road_Deaths'])}. "
            f"Road Accident Injured: {int(row['Road_Injured'])}. "
            f"Total Traffic Accident Cases: {int(row.get('Total_Accident_Cases', 0))}. "
            f"Total Traffic Deaths: {int(row.get('Total_Deaths', 0))}. "
            f"Data Source: National accident statistics India."
        )
        docs.append(doc)

    # Expenditure documents (group by county+year)
    for _, row in exp_df.iterrows():
        doc = (
            f"County: {row['CountyName']}. "
            f"Year: {int(row['CalendarYear'])}. "
            f"Road Construction Expenditure: ${int(row['Construction'])}. "
            f"Road Maintenance Expenditure: ${int(row['Maintenance'])}. "
            f"Total Road Expenditure: ${int(row['Total'])}. "
            f"Administration and Operations: ${int(row.get('AdministrationAndOperations', 0))}. "
            f"Data Source: County road expenditure records."
        )
        docs.append(doc)

    # Tamil Nadu district accident documents
    for _, row in district_df.iterrows():
        doc = (
            f"District/City: {row['District']}. "
            f"Total Road Accidents (2018): {int(row['Accident_Cases'])}. "
            f"Persons Injured (2018): {int(row['Injured'])}. "
            f"Persons Killed (2018): {int(row['Killed'])}. "
            f"State: Tamil Nadu. "
            f"Data Source: Tamil Nadu road accident statistics 2018."
        )
        docs.append(doc)

    return docs

def train_chatbot():
    print("Loading datasets...")
    main_df = load_combined()
    state_df = load_state_accidents()
    exp_df = load_expenditures()
    district_df = load_district_accidents()

    print(f"  Main roads: {len(main_df)} records")
    print(f"  State accidents: {len(state_df)} records")
    print(f"  Expenditures: {len(exp_df)} records")
    print(f"  District accidents: {len(district_df)} records")

    docs = build_documents(main_df, state_df, exp_df, district_df)
    print(f"Total documents: {len(docs)}")

    print("Loading sentence transformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    print("Generating embeddings...")
    embeddings = model.encode(docs, show_progress_bar=True)
    embeddings = np.array(embeddings).astype('float32')

    print("Building FAISS index...")
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    os.makedirs(MODEL_DIR, exist_ok=True)
    faiss.write_index(index, os.path.join(MODEL_DIR, 'road_index.faiss'))
    with open(os.path.join(MODEL_DIR, 'documents.pkl'), 'wb') as f:
        pickle.dump(docs, f)
    with open(os.path.join(MODEL_DIR, 'dataframe.pkl'), 'wb') as f:
        pickle.dump(main_df, f)
    # Save extra datasets for chatbot queries
    with open(os.path.join(MODEL_DIR, 'state_accidents.pkl'), 'wb') as f:
        pickle.dump(state_df, f)
    with open(os.path.join(MODEL_DIR, 'expenditures.pkl'), 'wb') as f:
        pickle.dump(exp_df, f)
    with open(os.path.join(MODEL_DIR, 'district_accidents.pkl'), 'wb') as f:
        pickle.dump(district_df, f)

    print("Chatbot model trained and saved!")
    return model, index, docs, main_df

def train_predictor():
    print("Training ML predictor...")
    df = load_combined()
    features = ['Accident_Count', 'Citizen_Complaints', 'Budget_Lakhs']
    df_clean = df[features].copy()
    df_clean['needs_maintenance'] = (
        (df['Accident_Count'] > 300) | (df['Citizen_Complaints'] > 25)
    ).astype(int)
    X = df_clean[features].values
    y = df_clean['needs_maintenance'].values
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)
    with open(os.path.join(MODEL_DIR, 'predictor.pkl'), 'wb') as f:
        pickle.dump(clf, f)
    print("Predictor model saved!")
    return clf

if __name__ == '__main__':
    train_chatbot()
    train_predictor()
    print("All models trained successfully!")
