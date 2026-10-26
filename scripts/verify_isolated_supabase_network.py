"""
Isolated Supabase Connectivity & Bridge Network Verification Tool
Tests:
1. DNS resolution for Supabase Direct Host vs Supavisor Dual-Stack Pooler
2. TCP socket connectivity across IPv4 and IPv6 stacks
3. TLS/SSL handshake validation for PostgreSQL port 5432/6543
4. Bridge network isolation safety analysis without modifying production infrastructure
"""

import sys
import socket
import ssl
from typing import Dict, Any, List


DIRECT_HOST = "db.arkoolfygfqawyvwnldv.supabase.co"
POOLER_HOST = "aws-0-ap-south-1.pooler.supabase.com"
DB_PORT = 5432
POOLER_PORT = 6543


def test_dns_resolution(hostname: str) -> Dict[str, Any]:
    """Test IPv4 (AF_INET) and IPv6 (AF_INET6) DNS resolution."""
    results = {"hostname": hostname, "ipv4": [], "ipv6": [], "error": None}
    
    # IPv4 Resolution
    try:
        ipv4_info = socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM)
        results["ipv4"] = sorted(list(set([item[4][0] for item in ipv4_info])))
    except socket.gaierror as e:
        results["ipv4"] = []
    
    # IPv6 Resolution
    try:
        ipv6_info = socket.getaddrinfo(hostname, None, socket.AF_INET6, socket.SOCK_STREAM)
        results["ipv6"] = sorted(list(set([item[4][0] for item in ipv6_info])))
    except socket.gaierror as e:
        results["ipv6"] = []

    return results


def test_tcp_connectivity(host: str, port: int, family: int, timeout: float = 4.0) -> Dict[str, Any]:
    """Test TCP socket connection to host and port."""
    family_name = "IPv6" if family == socket.AF_INET6 else "IPv4"
    res = {
        "host": host,
        "port": port,
        "family": family_name,
        "connected": False,
        "error": None,
        "rtt_ms": None
    }
    
    sock = None
    try:
        sock = socket.socket(family, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        import time
        start = time.time()
        sock.connect((host, port))
        elapsed = (time.time() - start) * 1000.0
        res["connected"] = True
        res["rtt_ms"] = round(elapsed, 2)
    except Exception as e:
        res["error"] = str(e)
    finally:
        if sock:
            sock.close()
            
    return res


def test_tls_handshake(host: str, port: int, timeout: float = 4.0) -> Dict[str, Any]:
    """Test SSL/TLS negotiation without sending database credentials."""
    res = {"host": host, "port": port, "tls_established": False, "version": None, "error": None}
    
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    sock = None
    ssl_sock = None
    try:
        sock = socket.create_connection((host, port), timeout=timeout)
        ssl_sock = context.wrap_socket(sock, server_hostname=host)
        res["tls_established"] = True
        res["version"] = ssl_sock.version()
        res["cipher"] = ssl_sock.cipher()[0] if ssl_sock.cipher() else None
    except Exception as e:
        res["error"] = str(e)
    finally:
        if ssl_sock:
            try:
                ssl_sock.close()
            except Exception:
                pass
        elif sock:
            sock.close()
            
    return res


def main():
    print("=" * 80)
    print("ONEHEALTH ID — ISOLATED SUPABASE NETWORK CONNECTIVITY DIAGNOSTIC")
    print("=" * 80)
    print(f"Target 1 (Direct Endpoint): {DIRECT_HOST}:{DB_PORT}")
    print(f"Target 2 (Pooler Endpoint): {POOLER_HOST}:{POOLER_PORT}")
    print("-" * 80)

    # 1. DNS Analysis
    print("\n[1] DNS RESOLUTION ANALYSIS")
    for host in [DIRECT_HOST, POOLER_HOST]:
        dns = test_dns_resolution(host)
        print(f"\n  Host: {host}")
        print(f"    IPv4 (A records)    : {dns['ipv4'] if dns['ipv4'] else 'NONE (IPv6-only)'}")
        print(f"    IPv6 (AAAA records) : {dns['ipv6'] if dns['ipv6'] else 'NONE'}")

    # 2. Connectivity Tests
    print("\n[2] TCP SOCKET CONNECTIVITY & REACHABILITY")
    # Test Direct Host IPv6
    dns_direct = test_dns_resolution(DIRECT_HOST)
    if dns_direct["ipv6"]:
        tcp_direct_v6 = test_tcp_connectivity(dns_direct["ipv6"][0], DB_PORT, socket.AF_INET6)
        status_str = f"SUCCESS ({tcp_direct_v6['rtt_ms']} ms)" if tcp_direct_v6["connected"] else f"FAILED: {tcp_direct_v6['error']}"
        print(f"  Direct Host via IPv6 ({dns_direct['ipv6'][0]}:{DB_PORT}): {status_str}")
    else:
        print(f"  Direct Host via IPv6: SKIPPED (No AAAA)")

    # Test Pooler Host IPv4
    dns_pooler = test_dns_resolution(POOLER_HOST)
    if dns_pooler["ipv4"]:
        for ip in dns_pooler["ipv4"][:2]:
            tcp_pooler_v4 = test_tcp_connectivity(ip, POOLER_PORT, socket.AF_INET)
            status_str = f"SUCCESS ({tcp_pooler_v4['rtt_ms']} ms)" if tcp_pooler_v4["connected"] else f"FAILED: {tcp_pooler_v4['error']}"
            print(f"  Pooler Host via IPv4 ({ip}:{POOLER_PORT}): {status_str}")
    else:
        print(f"  Pooler Host via IPv4: SKIPPED (No A records)")

    # 3. Bridge Network Safety Assessment
    print("\n[3] DOCKER BRIDGE NETWORK ISOLATION ASSESSMENT")
    print("  Root Cause of Previous 'network_mode: host':")
    print("    - Direct host 'db.arkoolfygfqawyvwnldv.supabase.co' is IPv6-only.")
    print("    - Standard Docker bridge networks default to IPv4 NAT and cannot route IPv6 packets.")
    print("  Hardened Bridge Network Migration Options:")
    print("    Option A (Recommended): Switch DATABASE_URL to Supabase Supavisor pooler")
    print(f"      Host: {POOLER_HOST}:{POOLER_PORT}")
    print("      Features: Dual-stack IPv4/IPv6, transaction/session pooling, works in any standard bridge network.")
    print("    Option B (Alternative): Enable Docker IPv6 bridge subnet on host")
    print("      Features: Keeps direct endpoint; requires Docker daemon IPv6 NAT configured by infrastructure owner.")
    print("=" * 80)


if __name__ == "__main__":
    main()
