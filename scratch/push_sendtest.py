import base64, os, json
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from pywebpush import webpush

VAPID_PRIVATE = "uwQiCRptVJyOrjfTD_gcttjsuQEyF6RVT1A76T4faYI"
VAPID_PUBLIC  = "BHHJZGpU2sZXix9ZxzzMTNm3jxBiPDEcr_rGgd2SNXHGzplQsig6IdfQ_2hQY5OGiXZqsJjnfli_4t4XdkDj2R8"

# Simulate a browser subscription's receiver keypair
priv = ec.generate_private_key(ec.SECP256R1())
raw_pub = priv.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
sub = {"endpoint": "https://httpbin.org/anything", "keys": {"p256dh": b64(raw_pub), "auth": b64(os.urandom(16))}}

resp = webpush(
    subscription_info=sub,
    data=json.dumps({"title": "Fahem", "body": "End-to-end push test", "url": "/"}),
    vapid_private_key=VAPID_PRIVATE,
    vapid_claims={"sub": "mailto:contact@fahem.pro"},
)
print("HTTP status:", resp.status_code)
try:
    h = resp.json().get("headers", {})
    auth = h.get("Authorization", "")
    print("Authorization starts:", auth[:40], "...")
    print("VAPID public key in header matches deployed:", VAPID_PUBLIC in auth)
    print("Content-Encoding:", h.get("Content-Encoding"))
    print("TTL header present:", "Ttl" in h)
    print("Encrypted body delivered:", bool(resp.json().get("data") or resp.json().get("files")))
except Exception as e:
    print("parse note:", e)
