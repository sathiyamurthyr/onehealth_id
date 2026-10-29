import requests
import json
import base64
import uuid
import time
import os
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HKDF_SALT = b"ohid-enterprise-payload-encryption-salt-2026"
HKDF_INFO_PREFIX = b"OH-ID-PAYLOAD-ENCRYPTION-V1"
VERSION = 1

# 1. Ephemeral Key Exchange
priv = ec.generate_private_key(ec.SECP256R1())
pub = priv.public_key()
pub_bytes = pub.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
pub_b64 = base64.b64encode(pub_bytes).decode()

hs_res = requests.post("https://ohid.online/api/v1/crypto/handshake", json={"client_public_key": pub_b64})
data = hs_res.json()
key_id = data["key_id"]
server_pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), base64.b64decode(data["server_public_key"]))

shared_secret = priv.exchange(ec.ECDH(), server_pub)
hkdf = HKDF(hashes.SHA256(), 32, HKDF_SALT, HKDF_INFO_PREFIX)
aes_key = hkdf.derive(shared_secret)
aesgcm = AESGCM(aes_key)

# 2. Encrypt & Post Login
ts = int(time.time())
req_id = f"req-{os.urandom(6).hex()}"
path = "/api/v1/auth/login"
plaintext_req = {"username": "admin", "password": "admin123"}
aad_str = f"v={VERSION}|method=POST|path={path}|key_id={key_id}|dir=req|req_id={req_id}|ts={ts}"
iv = os.urandom(12)
ct_tag = aesgcm.encrypt(iv, json.dumps(plaintext_req).encode(), aad_str.encode())
enc_req_body = {
    "version": VERSION,
    "key_id": key_id,
    "iv": base64.b64encode(iv).decode(),
    "encrypted_data": base64.b64encode(ct_tag[:-16]).decode(),
    "auth_tag": base64.b64encode(ct_tag[-16:]).decode(),
    "req_id": req_id,
    "ts": ts
}

req_headers = {
    "Host": "ohid.online",
    "Content-Type": "application/json",
    "X-OH-Encrypted": "1",
    "X-Session-Key-Id": key_id,
    "Accept": "application/vnd.oh-id.encrypted, application/json"
}

login_res = requests.post("https://ohid.online/api/v1/auth/login", json=enc_req_body, headers=req_headers)
enc_res_body = login_res.json()

# Decrypt login response
ct = base64.b64decode(enc_res_body["encrypted_data"])
iv_res = base64.b64decode(enc_res_body["iv"])
tag_res = base64.b64decode(enc_res_body["auth_tag"])
aad_res = f"v={enc_res_body['version']}|method=POST|path={path}|key_id={key_id}|dir=res|req_id={enc_res_body['req_id']}|ts={enc_res_body['ts']}"
decrypted_login_res = json.loads(aesgcm.decrypt(iv_res, ct + tag_res, aad_res.encode()))

# 3. GET /api/v1/me/hospitals
token = decrypted_login_res.get("access_token")
get_headers = {
    "Host": "ohid.online",
    "Authorization": f"Bearer {token}",
    "X-OH-Encrypted": "1",
    "X-Session-Key-Id": key_id,
    "Accept": "application/vnd.oh-id.encrypted, application/json"
}
hosp_res = requests.get("https://ohid.online/api/v1/me/hospitals", headers=get_headers)
hosp_enc_body = hosp_res.json()

ct_h = base64.b64decode(hosp_enc_body["encrypted_data"])
iv_h = base64.b64decode(hosp_enc_body["iv"])
tag_h = base64.b64decode(hosp_enc_body["auth_tag"])
aad_h = f"v={hosp_enc_body['version']}|method=GET|path=/api/v1/me/hospitals|key_id={key_id}|dir=res|req_id={hosp_enc_body['req_id']}|ts={hosp_enc_body['ts']}"
decrypted_hosp = json.loads(aesgcm.decrypt(iv_h, ct_h + tag_h, aad_h.encode()))

output = {
    "handshake": {
        "client_public_key_sent": pub_b64,
        "response": data
    },
    "post_login": {
        "plaintext_request": plaintext_req,
        "request_headers": req_headers,
        "request_envelope": enc_req_body,
        "response_status": login_res.status_code,
        "response_headers": dict(login_res.headers),
        "response_envelope": enc_res_body,
        "decrypted_response": decrypted_login_res
    },
    "get_hospitals": {
        "request_headers": get_headers,
        "response_status": hosp_res.status_code,
        "response_headers": dict(hosp_res.headers),
        "response_envelope": hosp_enc_body,
        "decrypted_response": decrypted_hosp
    }
}

with open("scripts/live_request_response_sample.json", "w") as f:
    json.dump(output, f, indent=2)

print("SUCCESS_SAVED_SAMPLE")
