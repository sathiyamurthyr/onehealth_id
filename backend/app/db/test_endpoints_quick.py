import requests

base_url = "http://localhost:8050/api/v1/super-admin"
endpoints = ['metrics', 'hospitals', 'clients', 'subscriptions', 'payments', 'support', 'audit', 'health']

for ep in endpoints:
    r = requests.get(f"{base_url}/{ep}")
    print(f"GET /{ep} -> {r.status_code}, success={r.json().get('success')}")

# Test hospital details
hosp_res = requests.get(f"{base_url}/hospitals/hosp-kedar")
print(f"GET /hospitals/hosp-kedar -> {hosp_res.status_code}, name={hosp_res.json().get('data', {}).get('name')}")
