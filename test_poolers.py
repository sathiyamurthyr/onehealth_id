import psycopg2

poolers = [
    ("ap-south-1 (6543)", "postgresql://postgres.arkoolfygfqawyvwnldv:AivioSathus!321@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"),
    ("ap-south-1 (5432)", "postgresql://postgres.arkoolfygfqawyvwnldv:AivioSathus!321@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"),
    ("ap-southeast-1 (6543)", "postgresql://postgres.arkoolfygfqawyvwnldv:AivioSathus!321@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"),
    ("ap-southeast-1 (5432)", "postgresql://postgres.arkoolfygfqawyvwnldv:AivioSathus!321@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"),
    ("us-east-1 (6543)", "postgresql://postgres.arkoolfygfqawyvwnldv:AivioSathus!321@aws-0-us-east-1.pooler.supabase.com:6543/postgres"),
]

for label, url in poolers:
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        print(f"SUCCESS: {label} -> {cur.fetchone()}")
        conn.close()
    except Exception as e:
        print(f"FAILED: {label} -> {e}")
