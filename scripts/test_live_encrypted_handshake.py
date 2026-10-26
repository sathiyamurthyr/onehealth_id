import requests
import base64
import json
import time
import os
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HKDF_SALT = b"ohid-enterprise-payload-encryption-salt-2026"
HKDF_INFO_PREFIX = b"OH-ID-PAYLOAD-ENCRYPTION-V1"
VERSION = 1

session = requests.Session()

print("=" * 70)
print("OH-ID LIVE PAYLOAD ENCRYPTION AUDIT & ROUNDTRIP VERIFICATION")
print("Target Host: https://ohid.online")
print("=" * 70)

# Test 1: Verify unencrypted request is strictly BLOCKED
res_plain = session.get("https://ohid.online/api/v1/me/hospitals")
print(f"\n[Test 1] Unencrypted GET /api/v1/me/hospitals")
print(f"Status Code: {res_plain.status_code}")
print(f"Response Body: {res_plain.text}")
assert res_plain.status_code == 400
assert res_plain.json()["error"]["code"] == "ENCRYPTION_REQUIRED"
print("Result: PASS — Plain unencrypted requests are strictly BLOCKED.\n")

# Test 2: Ephemeral ECDH Key Exchange Handshake
print("[Test 2] ECDH P-256 Ephemeral Key Exchange (/api/v1/crypto/handshake)")
priv = ec.generate_private_key(ec.SECP256R1())
pub = priv.public_key()
pub_bytes = pub.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)
pub_b64 = base64.b64encode(pub_bytes).decode()

handshake_res = session.post("https://ohid.online/api/v1/crypto/handshake", json={"client_public_key": pub_b64})
assert handshake_res.status_code == 200, f"Handshake failed: {handshake_res.text}"
data = handshake_res.json()
key_id = data["key_id"]
server_pub_bytes = base64.b64decode(data["server_public_key"])
server_pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), server_pub_bytes)

# Derive AES-256-GCM symmetric session key
shared_secret = priv.exchange(ec.ECDH(), server_pub)
hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=HKDF_SALT, info=HKDF_INFO_PREFIX)
aes_key = hkdf.derive(shared_secret)
aesgcm = AESGCM(aes_key)
print(f"Handshake Status: {handshake_res.status_code}")
print(f"Established Key ID: {key_id}")
print("Result: PASS — Session AES-256-GCM key derived successfully.\n")

def encrypt_envelope(method: str, path: str, payload: dict) -> dict:
    ts = int(time.time())
    req_id = f"req-{os.urandom(6).hex()}"
    aad_str = f"v={VERSION}|method={method.upper()}|path={path}|key_id={key_id}|dir=req|req_id={req_id}|ts={ts}"
    iv = os.urandom(12)
    plaintext = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ct_with_tag = aesgcm.encrypt(iv, plaintext, aad_str.encode("utf-8"))
    ct = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    return {
        "version": VERSION,
        "key_id": key_id,
        "iv": base64.b64encode(iv).decode("ascii"),
        "encrypted_data": base64.b64encode(ct).decode("ascii"),
        "auth_tag": base64.b64encode(tag).decode("ascii"),
        "req_id": req_id,
        "ts": ts
    }

def decrypt_envelope(method: str, path: str, envelope: dict) -> dict:
    ct = base64.b64decode(envelope["encrypted_data"])
    iv = base64.b64decode(envelope["iv"])
    tag = base64.b64decode(envelope["auth_tag"])
    aad_str = f"v={envelope['version']}|method={method.upper()}|path={path}|key_id={key_id}|dir=res|req_id={envelope['req_id']}|ts={envelope['ts']}"
    decrypted_bytes = aesgcm.decrypt(iv, ct + tag, aad_str.encode("utf-8"))
    return json.loads(decrypted_bytes.decode("utf-8"))

# Test 3: Authenticated Login using Encrypted Payload
print("[Test 3] Encrypted Login via POST /api/v1/auth/login")
login_payload = {"username": "admin", "password": "admin123"}
enc_login = encrypt_envelope("POST", "/api/v1/auth/login", login_payload)

headers = {
    "X-OH-Encrypted": "1",
    "X-Session-Key-Id": key_id,
    "Content-Type": "application/json",
    "Accept": "application/vnd.oh-id.encrypted, application/json"
}
login_res = session.post("https://ohid.online/api/v1/auth/login", json=enc_login, headers=headers)
print(f"Login Response Status: {login_res.status_code}")
login_envelope = login_res.json()
print("Wire Envelope Sample:", {
    "key_id": login_envelope.get("key_id"),
    "encrypted_data": login_envelope.get("encrypted_data", "")[:40] + "...",
    "auth_tag": login_envelope.get("auth_tag")
})
decrypted_login = decrypt_envelope("POST", "/api/v1/auth/login", login_envelope)
token = decrypted_login.get("access_token")
print(f"Decrypted Token: {token[:25]}...")
print("Result: PASS — Encrypted request decrypted and response encrypted.\n")

# Test 4: Authenticated Encrypted GET /api/v1/me/hospitals
print("[Test 4] Encrypted GET /api/v1/me/hospitals")
headers_hosp = {
    "Authorization": f"Bearer {token}",
    "X-OH-Encrypted": "1",
    "X-Session-Key-Id": key_id,
    "Accept": "application/vnd.oh-id.encrypted, application/json"
}
hosp_res = session.get("https://ohid.online/api/v1/me/hospitals", headers=headers_hosp)
print(f"Status Code: {hosp_res.status_code}")
hosp_envelope = hosp_res.json()

print("\n--- RAW NETWORK ENVELOPE (WHAT SNIFFERS / DEVTOOLS SEE OVER THE WIRE) ---")
print(json.dumps(hosp_envelope, indent=2))
print("-------------------------------------------------------------------------")

# Test 5: Client-Side Decryption of the Encrypted Envelope
decrypted_hospitals = decrypt_envelope("GET", "/api/v1/me/hospitals", hosp_envelope)
print("\n--- CLIENT-SIDE DECRYPTED DATA (WHAT THE SECURE WEB APP DISPLAYS) ---")
print(json.dumps(decrypted_hospitals, indent=2))
print("---------------------------------------------------------------------")
print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
