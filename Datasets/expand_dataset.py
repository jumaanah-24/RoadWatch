import pandas as pd
import numpy as np
import random
import os

random.seed(42)
np.random.seed(42)

DATASET_DIR = r'C:\Users\USER\Desktop\RoadSafety\Datasets'

adsi = pd.read_csv(os.path.join(DATASET_DIR, 'ADSI_Table_1A.2.csv'))
adsi = adsi[~adsi['State/UT/City'].str.startswith('Total', na=True)].copy()
adsi.columns = adsi.columns.str.strip()

tn_dist = pd.read_csv(os.path.join(DATASET_DIR, 'road_accidents_by_districts_2020.csv'))
tn_dist = tn_dist[~tn_dist['City / District'].str.startswith('Total', na=True)]
tn_dist = tn_dist[~tn_dist['City / District'].str.startswith('Railway', na=True)].copy()

rs = pd.read_csv(os.path.join(DATASET_DIR, 'RS_Session_262_AU_412_B_ii.csv'))
state_costs = {}
for _, row in rs.iterrows():
    state = str(row['State/UT']).strip()
    cost = pd.to_numeric(row['Projects Received and Finalized - Cost'], errors='coerce')
    if not pd.isna(cost):
        state_costs[state] = state_costs.get(state, 0) + float(cost)

STATE_COORDS = {
    'Andhra Pradesh': (15.9129, 79.7400), 'Arunachal Pradesh': (28.2180, 94.7278),
    'Assam': (26.2006, 92.9376), 'Bihar': (25.0961, 85.3131),
    'Chhattisgarh': (21.2787, 81.8661), 'Goa': (15.2993, 74.1240),
    'Gujarat': (22.2587, 71.1924), 'Haryana': (29.0588, 76.0856),
    'Himachal Pradesh': (31.1048, 77.1734), 'Jharkhand': (23.6102, 85.2799),
    'Karnataka': (15.3173, 75.7139), 'Kerala': (10.8505, 76.2711),
    'Madhya Pradesh': (22.9734, 78.6569), 'Maharashtra': (19.7515, 75.7139),
    'Manipur': (24.6637, 93.9063), 'Meghalaya': (25.4670, 91.3662),
    'Mizoram': (23.1645, 92.9376), 'Nagaland': (26.1584, 94.5624),
    'Odisha': (20.9517, 85.0985), 'Punjab': (31.1471, 75.3412),
    'Rajasthan': (27.0238, 74.2179), 'Sikkim': (27.5330, 88.5122),
    'Tamil Nadu': (11.1271, 78.6569), 'Telangana': (18.1124, 79.0193),
    'Tripura': (23.9408, 91.9882), 'Uttar Pradesh': (26.8467, 80.9462),
    'Uttarakhand': (30.0668, 79.0193), 'West Bengal': (22.9868, 87.8550),
    'Andaman and Nicobar Islands': (11.7401, 92.6586), 'Chandigarh': (30.7333, 76.7794),
    'Delhi': (28.7041, 77.1025), 'Jammu and Kashmir': (33.7782, 76.5762),
    'Ladakh': (34.1526, 77.5770), 'Puducherry': (11.9416, 79.8083),
    'Agra': (27.1767, 78.0081), 'Ahmedabad': (23.0225, 72.5714),
    'Amritsar': (31.6340, 74.8723), 'Bengaluru': (12.9716, 77.5946),
    'Bhopal': (23.2599, 77.4126), 'Chennai': (13.0827, 80.2707),
    'Coimbatore': (11.0168, 76.9558), 'Hyderabad': (17.3850, 78.4867),
    'Indore': (22.7196, 75.8577), 'Jaipur': (26.9124, 75.7873),
    'Kanpur': (26.4499, 80.3319), 'Kochi': (9.9312, 76.2673),
    'Kolkata': (22.5726, 88.3639), 'Lucknow': (26.8467, 80.9462),
    'Madurai': (9.9252, 78.1198), 'Mumbai': (19.0760, 72.8777),
    'Nagpur': (21.1458, 79.0882), 'Patna': (25.5941, 85.1376),
    'Pune': (18.5204, 73.8567), 'Surat': (21.1702, 72.8311),
    'Thiruvananthapuram': (8.5241, 76.9366), 'Vijayawada': (16.5062, 80.6480),
    'Vishakhapatnam': (17.6868, 83.2185), 'Srinagar': (34.0837, 74.7973),
    'Jodhpur': (26.2389, 73.0243), 'Ludhiana': (30.9010, 75.8573),
    'Varanasi': (25.3176, 82.9739), 'Ranchi': (23.3441, 85.3096),
    'Raipur': (21.2514, 81.6296), 'Rajkot': (22.3039, 70.8022),
    'Gwalior': (26.2183, 78.1828), 'Jabalpur': (23.1815, 79.9864),
    'Meerut': (28.9845, 77.7064), 'Faridabad': (28.4089, 77.3178),
    'Ghaziabad': (28.6692, 77.4538), 'Nasik': (19.9975, 73.7898),
    'Aurangabad': (19.8762, 75.3433), 'Asansol': (23.6833, 86.9833),
    'Dhanbad': (23.7957, 86.4304), 'Jamshedpur': (22.8046, 86.2029),
    'Kota': (25.2138, 75.8648), 'Kozhikode': (11.2588, 75.7804),
    'Kannur': (11.8745, 75.3704), 'Kollam': (8.8932, 76.6141),
    'Thrissur': (10.5276, 76.2144), 'Malappuram': (11.0510, 76.0711),
    'Tiruchirappalli': (10.7905, 78.7047), 'Prayagraj +': (25.4358, 81.8463),
    'Vadodara': (22.3072, 73.1812), 'Vasai Virar': (19.3919, 72.8397),
    'Chennai City': (13.0827, 80.2707), 'Coimbatore City': (11.0168, 76.9558),
    'Madurai City': (9.9252, 78.1198), 'Salem City': (11.6643, 78.1460),
    'Tirunelveli City': (8.7139, 77.7567), 'Tiruppur City': (11.1085, 77.3411),
    'Tiruchirappalli City': (10.7905, 78.7047), 'Ariyalur': (11.1400, 79.0800),
    'Cuddalore': (11.7480, 79.7714), 'Dharmapuri': (12.1211, 78.1582),
    'Dindigul': (10.3624, 77.9695), 'Erode': (11.3410, 77.7172),
    'Kancheepuram': (12.8185, 79.6947), 'Kanniyakumari': (8.0883, 77.5385),
    'Karur': (10.9601, 78.0766), 'Krishnagiri': (12.5186, 78.2137),
    'Nagapattinam': (10.7672, 79.8449), 'Namakkal': (11.2189, 78.1674),
    'Nilgiris': (11.4916, 76.7337), 'Perambalur': (11.2333, 78.8833),
    'Pudukkottai': (10.3797, 78.8201), 'Ramanathapuram': (9.3639, 78.8395),
    'Salem': (11.6643, 78.1460), 'Sivaganga': (9.8477, 78.4800),
    'Thanjavur': (10.7870, 79.1378), 'Theni': (10.0104, 77.4770),
    'Tirunelveli': (8.7139, 77.7567), 'Tiruppur': (11.1085, 77.3411),
    'Tiruvallur': (13.1437, 79.9088), 'Tiruvannamalai': (12.2253, 79.0747),
    'Tiruvarur': (10.7726, 79.6366), 'Thoothukudi': (8.7642, 78.1348),
    'Vellore': (12.9165, 79.1325), 'Villupuram': (11.9401, 79.4861),
    'Virudhunagar': (9.5851, 77.9629),
    'Durg Bhilainagar': (21.1938, 81.2833), 'Chandigarh (city)': (30.7333, 76.7794),
    'Delhi (city)': (28.7041, 77.1025),
}

STATE_MAP = {
    'Chennai': 'Tamil Nadu', 'Chennai City': 'Tamil Nadu', 'Coimbatore': 'Tamil Nadu',
    'Coimbatore City': 'Tamil Nadu', 'Madurai': 'Tamil Nadu', 'Madurai City': 'Tamil Nadu',
    'Salem': 'Tamil Nadu', 'Salem City': 'Tamil Nadu', 'Tiruchirappalli': 'Tamil Nadu',
    'Tiruchirappalli City': 'Tamil Nadu', 'Tirunelveli': 'Tamil Nadu', 'Tirunelveli City': 'Tamil Nadu',
    'Tiruppur': 'Tamil Nadu', 'Tiruppur City': 'Tamil Nadu', 'Ariyalur': 'Tamil Nadu',
    'Cuddalore': 'Tamil Nadu', 'Dharmapuri': 'Tamil Nadu', 'Dindigul': 'Tamil Nadu',
    'Erode': 'Tamil Nadu', 'Kancheepuram': 'Tamil Nadu', 'Kanniyakumari': 'Tamil Nadu',
    'Karur': 'Tamil Nadu', 'Krishnagiri': 'Tamil Nadu', 'Nagapattinam': 'Tamil Nadu',
    'Namakkal': 'Tamil Nadu', 'Nilgiris': 'Tamil Nadu', 'Perambalur': 'Tamil Nadu',
    'Pudukkottai': 'Tamil Nadu', 'Ramanathapuram': 'Tamil Nadu', 'Sivaganga': 'Tamil Nadu',
    'Thanjavur': 'Tamil Nadu', 'Theni': 'Tamil Nadu', 'Tiruvallur': 'Tamil Nadu',
    'Tiruvannamalai': 'Tamil Nadu', 'Tiruvarur': 'Tamil Nadu', 'Thoothukudi': 'Tamil Nadu',
    'Vellore': 'Tamil Nadu', 'Villupuram': 'Tamil Nadu', 'Virudhunagar': 'Tamil Nadu',
    'Bengaluru': 'Karnataka', 'Hyderabad': 'Telangana', 'Mumbai': 'Maharashtra',
    'Pune': 'Maharashtra', 'Nagpur': 'Maharashtra', 'Aurangabad': 'Maharashtra',
    'Nasik': 'Maharashtra', 'Vasai Virar': 'Maharashtra', 'Durg Bhilainagar': 'Chhattisgarh',
    'Ahmedabad': 'Gujarat', 'Surat': 'Gujarat', 'Rajkot': 'Gujarat', 'Vadodara': 'Gujarat',
    'Delhi': 'Delhi', 'Delhi (city)': 'Delhi', 'Chandigarh (city)': 'Chandigarh',
    'Kolkata': 'West Bengal', 'Asansol': 'West Bengal',
    'Jaipur': 'Rajasthan', 'Jodhpur': 'Rajasthan', 'Kota': 'Rajasthan',
    'Lucknow': 'Uttar Pradesh', 'Kanpur': 'Uttar Pradesh', 'Agra': 'Uttar Pradesh',
    'Meerut': 'Uttar Pradesh', 'Ghaziabad': 'Uttar Pradesh', 'Varanasi': 'Uttar Pradesh',
    'Prayagraj +': 'Uttar Pradesh',
    'Bhopal': 'Madhya Pradesh', 'Indore': 'Madhya Pradesh', 'Gwalior': 'Madhya Pradesh',
    'Jabalpur': 'Madhya Pradesh', 'Raipur': 'Chhattisgarh',
    'Patna': 'Bihar', 'Ranchi': 'Jharkhand', 'Jamshedpur': 'Jharkhand', 'Dhanbad': 'Jharkhand',
    'Amritsar': 'Punjab', 'Ludhiana': 'Punjab', 'Chandigarh': 'Chandigarh', 'Faridabad': 'Haryana',
    'Kochi': 'Kerala', 'Thiruvananthapuram': 'Kerala', 'Kozhikode': 'Kerala',
    'Kannur': 'Kerala', 'Kollam': 'Kerala', 'Thrissur': 'Kerala', 'Malappuram': 'Kerala',
    'Srinagar': 'Jammu and Kashmir', 'Vijayawada': 'Andhra Pradesh', 'Vishakhapatnam': 'Andhra Pradesh',
}

STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
          'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
          'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
          'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
          'Uttarakhand','West Bengal','Delhi','Chandigarh','Puducherry',
          'Jammu and Kashmir','Ladakh','Andaman and Nicobar Islands']

CONTRACTORS = [f'Contractor_{i}' for i in range(1, 101)]
ROAD_TYPES = ['National Highway', 'State Highway', 'District Road', 'Urban Road']

def get_state(region):
    if region in STATE_MAP:
        return STATE_MAP[region]
    if region in STATES:
        return region
    return 'India'

def get_coords(region):
    return STATE_COORDS.get(region, (20.5937, 78.9629))

def make_roads(region, base_accidents, n_roads, base_expenditure=5000000):
    coords = get_coords(region)
    state = get_state(region)
    rows = []
    for i in range(n_roads):
        acc = max(0, int(base_accidents / n_roads * random.uniform(0.2, 2.8)))
        exp = int(base_expenditure * random.uniform(0.5, 3.0))
        complaints = random.randint(0, min(50, max(1, acc // 20)))
        has_maint = random.random() > 0.35
        days_ago = random.randint(-400, 30)
        maint_date = (pd.Timestamp.now() + pd.Timedelta(days=days_ago)).strftime('%d-%m-%Y') if has_maint else None
        lat = round(coords[0] + random.uniform(-0.5, 0.5), 6)
        lng = round(coords[1] + random.uniform(-0.5, 0.5), 6)
        rows.append({
            'Road_Name': f'{region}_Road_{i+1}',
            'District': region,
            'State': state,
            'Road_Expenditure': exp,
            'Accident_Count': acc,
            'Last_Maintenance_Date': maint_date,
            'Contractor': random.choice(CONTRACTORS),
            'Citizen_Complaints': complaints,
            'Latitude': lat,
            'Longitude': lng,
            'Road_Type': ROAD_TYPES[i % 4],
        })
    return rows

all_rows = []

# 1. Original Coimbatore roads with lat/lng
combined_path = os.path.join(DATASET_DIR, 'Combined_Road_Transparency_Dataset.csv')
source_files = ['cbe_data.csv', 'dataset2.csv']
if os.path.exists(combined_path):
    orig = pd.read_csv(combined_path)
else:
    source_dfs = []
    for filename in source_files:
        path = os.path.join(DATASET_DIR, filename)
        if os.path.exists(path):
            source_dfs.append(pd.read_csv(path))
    if not source_dfs:
        raise FileNotFoundError(
            f"No source dataset files found in {DATASET_DIR}. Expected one of: {', '.join(source_files)}"
        )
    orig = pd.concat(source_dfs, ignore_index=True, sort=False)
    orig = orig.drop_duplicates(subset=['Road_Name']).reset_index(drop=True)
coords = get_coords('Coimbatore')
for i, (_, row) in enumerate(orig.iterrows()):
    lat = round(coords[0] + random.uniform(-0.3, 0.3), 6)
    lng = round(coords[1] + random.uniform(-0.3, 0.3), 6)
    all_rows.append({
        'Road_Name': row['Road_Name'],
        'District': 'Coimbatore',
        'State': 'Tamil Nadu',
        'Road_Expenditure': row['Road_Expenditure'],
        'Accident_Count': row['Accident_Count'],
        'Last_Maintenance_Date': row['Last_Maintenance_Date'],
        'Contractor': row['Contractor'],
        'Citizen_Complaints': row['Citizen_Complaints'],
        'Latitude': lat,
        'Longitude': lng,
        'Road_Type': ROAD_TYPES[i % 4],
    })

covered = {'Coimbatore'}

# 2. ADSI states and cities
for _, row in adsi.iterrows():
    region = str(row['State/UT/City']).strip()
    if region.startswith('Total') or region in covered:
        continue
    acc = pd.to_numeric(row['Road Accidents - Cases'], errors='coerce')
    if pd.isna(acc) or acc == 0:
        continue
    acc = int(acc)
    n = 12 if acc > 30000 else (8 if acc > 10000 else (5 if acc > 1000 else 3))
    state_name = get_state(region)
    base_exp = int(state_costs.get(state_name, 1000) * 100000 / max(n, 1))
    all_rows.extend(make_roads(region, acc, n, base_exp))
    covered.add(region)

# 3. TN districts not yet covered
for _, row in tn_dist.iterrows():
    district = str(row['City / District']).strip()
    if district in covered:
        continue
    acc = pd.to_numeric(row['Total Number of Accidents (2018)'], errors='coerce')
    if pd.isna(acc):
        continue
    all_rows.extend(make_roads(district, int(acc), 5))
    covered.add(district)

df_out = pd.DataFrame(all_rows).drop_duplicates(subset=['Road_Name']).reset_index(drop=True)
df_out.to_csv(os.path.join(DATASET_DIR, 'Combined_Road_Transparency_Dataset.csv'), index=False)

print(f"Total roads: {len(df_out)}")
print(f"Districts/Regions: {df_out['District'].nunique()}")
print(f"States: {df_out['State'].nunique()}")
print("States list:", sorted(df_out['State'].unique().tolist()))
