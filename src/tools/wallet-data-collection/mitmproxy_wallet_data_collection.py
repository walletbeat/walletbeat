from __future__ import annotations

import base64
import enum
import hashlib
import json
import logging
import os
import re
import time
import threading
import urllib.parse
from typing import Set, Tuple, Dict, Optional, List, Union

from mitmproxy import ctx
from mitmproxy import http
from mitmproxy.addonmanager import Loader


class UxFlow(enum.StrEnum):
    IDLE_PRE_INSTALL = "IDLE_PRE_INSTALL"
    INSTALL = "INSTALL"
    ONBOARDING_NEW = "ONBOARDING_NEW"
    ONBOARDING_IMPORT = "ONBOARDING_IMPORT"
    SEND_ETHER = "SEND_ETHER"
    SEND_USDC = "SEND_USDC"
    NATIVE_SWAP = "NATIVE_SWAP"
    APP_CONNECTION = "APP_CONNECTION"
    MAKE_TRANSACTION = "MAKE_TRANSACTION"


_KNOWN_BENIGN_HEADERS = frozenset(
    h.lower()
    for h in (
        "Accept-Encoding",
        "Accept-Ranges",
        "User-Agent",
        "Cookie",  # Handled separately
        "Host",
        "Accept",
        "Accept-Language",
        "Cache-Control",
        "Content-Length",
        "Content-Type",
        "Content-Encoding",
        "Connection",
        "Origin",
        "Pragma",
        "Upgrade",
        "Upgrade-Insecure-Requests",
        "Vary",
        "Sec-Fetch-Dest",
        "Sec-Fetch-Site",
        "Sec-Fetch-User",
        "Sec-Fetch-Mode",
        "Sec-Fetch-Storage-Access",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform",
        "sec-ch-ua-arch",
        "sec-ch-ua-bitness",
        "sec-ch-ua-form-factor",
        "sec-ch-ua-full-version",
        "sec-ch-ua-full-version-list",
        "sec-ch-ua-model",
        "sec-ch-ua-platform-version",
        "sec-ch-ua-wow64",
        "Sec-WebSocket-Version",
        "Sec-WebSocket-Key",
        "Sec-WebSocket-Extensions",
        "Transfer-Encoding",
    )
)

_KNOWN_BENIGN_RESPONSE_ONLY_HEADERS = frozenset(
    h.lower()
    for h in (
        "Accept-CH",
        "Age",
        "access-control-allow-headers",
        "Date",
        "Expires",
        "Last-Modified",
        "X-Content-Type-Options",
        "Server",
        "X-XSS-Protection",
        "X-Frame-Options",
        "Content-Security-Policy",
        "Content-Security-Policy-Report-Only",
        "Permissions-Policy",
        "X-Identity-Content-Length",
        "Etag",
        "Content-Disposition",
        "Strict-Transport-Security",
        "Access-Control-Allow-Origin",
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Resource-Policy",
        "Cross-Origin-Opener-Policy-Report-Only",
        "Source-Age",
    )
)


def is_benign_header(header: str) -> bool:
    return header.lower() in _KNOWN_BENIGN_HEADERS


def is_benign_response_header(header: str) -> bool:
    h = header.lower()
    return h in _KNOWN_BENIGN_HEADERS or h in _KNOWN_BENIGN_RESPONSE_ONLY_HEADERS


class UserInfo(enum.StrEnum):
    TRACKING_IDENTIFIER = "TRACKING_IDENTIFIER"
    PSEUDONYM = "PSEUDONYM"
    LEGAL_NAME = "LEGAL_NAME"
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    BROWSING_HISTORY_URLS = "BROWSING_HISTORY_URLS"
    CONTACTS = "CONTACTS"
    PHYSICAL_ADDRESS = "PHYSICAL_ADDRESS"
    FACE = "FACE"
    CEX_ACCOUNT = "CEX_ACCOUNT"
    GOVERNMENT_ID = "GOVERNMENT_ID"
    X_DOT_COM_ACCOUNT = "X_DOT_COM_ACCOUNT"
    FARCASTER_ACCOUNT = "FARCASTER_ACCOUNT"
    USER_ACTIONS = "USER_ACTIONS"
    ACCOUNT_ADDRESS = "ACCOUNT_ADDRESS"
    BALANCE = "BALANCE"
    ASSETS = "ASSETS"
    MEMPOOL_TRANSACTIONS = "MEMPOOL_TRANSACTIONS"
    WALLET_CONNECTED_DOMAINS = "WALLET_CONNECTED_DOMAINS"

    def label_prefix(self) -> str:
        # Match TypeScript: just remove underscores, don't lowercase
        return self.value.replace("_", "")


class UserDataString:
    """A raw string paired with classified UserInfo pieces. Stored with deduplication."""

    def __init__(self, str: str, pieces: Set[UserInfo]):
        self.str = str
        self.pieces = pieces

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, UserDataString):
            return False
        return self.str == other.str and self.pieces == other.pieces

    def __hash__(self) -> int:
        return hash((self.str, self.pieces))

    def __repr__(self) -> str:
        if len(self.pieces) == 0:
            return f"{repr(self.str)} [no user data]"
        pieces_str = " ".join(sorted(str(p) for p in self.pieces))
        return f"{repr(self.str)} [{pieces_str}]"

    def encode(self) -> dict:
        data: dict = {"str": self.str}
        sorted_pieces = list(sorted(str(p) for p in self.pieces))
        if len(sorted_pieces) == 1:
            data["piece"] = sorted_pieces[0]
        elif len(sorted_pieces) > 1:
            data["pieces"] = sorted_pieces
        return data

    @classmethod
    def decode(cls, data: dict) -> UserDataString:
        pieces: Set[UserInfo] = set()
        if "piece" in data:
            pieces.add(UserInfo[data["piece"]])
        if "pieces" in data:
            for p in data["pieces"]:
                pieces.add(UserInfo[p])
        if len(pieces) == 0:
            raise ValueError(f"Invalid UserDataString: {repr(data)}")
        return cls(str=data["str"], pieces=pieces)


class UserDataStringStore:
    """A deduplicated set of UserDataString objects."""

    @classmethod
    def decode(cls, data: list[dict]) -> UserDataStringStore:
        store = cls()
        for item_data in data:
            store.add(UserDataString.decode(item_data))
        return store

    @classmethod
    def new(cls) -> UserDataStringStore:
        return cls()

    def __init__(self):
        self._lock = threading.Lock()
        self._strings: dict[str, UserDataString] = {}
        self._needs_flushing = 0

    def add(self, item: UserDataString) -> None:
        with self._lock:
            existing = self._strings.get(item.str, None)
            if existing is None:
                self._strings[item.str] = item
                self._needs_flushing += 1
                return
            before_merge = len(existing.pieces)
            for piece in item.pieces:
                existing.pieces.add(piece)
            if before_merge != len(existing.pieces):
                self._needs_flushing += 1

    def needs_flushing(self) -> int:
        with self._lock:
            return self._needs_flushing

    def mark_flushing_done(self, amount: int) -> None:
        with self._lock:
            self._needs_flushing -= amount

    def encode(self) -> list[dict]:
        with self._lock:
            return [
                item.encode()
                for item in sorted(self._strings.values(), key=lambda x: x.str)
            ]


def _multidict_to_dict_of_tuples(
    multidict, filter_fn=None
) -> Dict[str, Tuple[str, ...]]:
    """Convert a MultiDictView to Dict[str, Tuple[str, ...]], preserving all values."""
    result: Dict[str, List[str]] = {}
    items = multidict.items(multi=True) if hasattr(multidict, "items") else []
    for k, v in items:
        if filter_fn is not None and not filter_fn(k):
            continue
        if k not in result:
            result[k] = []
        result[k].append(v)
    return {k: tuple(v) for k, v in result.items()}


def _is_ethereum_hex_string(s: str, length: int) -> bool:
    """Check if a string is a valid Ethereum hex string (0x + `length` hex chars).
    Case-insensitive for the hex portion."""
    if len(s) != 2 + length:
        return False
    if s[0].lower() != "0" or s[1].lower() != "x":
        return False
    hex_part = s[2:]
    return all(c in "0123456789abcdefABCDEF" for c in hex_part)


def _is_ethereum_txid(s: str) -> bool:
    """Check if a string is a valid Ethereum transaction hash (0x + 64 hex chars)."""
    return _is_ethereum_hex_string(s, 64)


def _is_ethereum_address(s: str) -> bool:
    """Check if a string is a valid Ethereum address (0x + 40 hex chars)."""
    return _is_ethereum_hex_string(s, 40)


def _extract_ethereum_values(text: str) -> list[str] | None:
    """Scan text case-insensitively for Ethereum txids and addresses.

    Returns a sorted, deduplicated list of unique values found, or None if no matches.
    Scans for all token-like substrings starting with 0x followed by hex characters,
    then classifies each as a txid (64 hex) or address (40 hex).
    """

    matches = re.findall(r"(?:[^0-9a-fA-F]|^)(0x[0-9a-fA-F]+)(?:[^0-9a-fA-F]|$)", text)
    if not matches:
        return None

    found: set[str] = set()
    for m in matches:
        lower = m.lower()
        if _is_ethereum_txid(lower) or _is_ethereum_address(lower):
            found.add(lower)

    if not found:
        return None
    return list(sorted(found))


def _collect_unique_keys_from_obj(obj: object) -> set[str]:
    """Recursively collect all keys from nested dicts."""
    keys: set[str] = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            keys.add(k)
            keys.update(_collect_unique_keys_from_obj(v))
    elif isinstance(obj, list):
        for item in obj:
            keys.update(_collect_unique_keys_from_obj(item))
    return keys


def _maybe_truncate_key(key: str, max_bytes: int = 300) -> str:
    """Truncate long keys to first128...last128 if they exceed max_bytes bytes."""
    if len(key.encode("utf-8")) <= max_bytes:
        return key
    return key[:128] + "..." + key[-128:]


def _compact_unique_keys(
    unique_keys: list[str],
) -> dict:
    """Compact unique_keys to reduce size for abbreviated payloads.

    Returns a dict with 'keys' (the final keys), 'as_string' (whether to
    store as pipe-separated string), and 'pruned_count' (keys removed by pruning).
    """
    # Step A: Filter empty string
    keys = set(unique_keys)
    keys.discard("")

    # Step B: Truncate keys > 300 bytes
    keys = {_maybe_truncate_key(k) for k in keys}

    # Re-deduplicate in case truncation created collisions

    # Step C: Prune if > 48 unique keys
    pruned_count = 0

    if len(keys) > 48:
        # Bucket by byte length
        buckets: dict[int, set[str]] = {}
        for k in keys:
            bucket_len = len(k.encode("utf-8"))
            if bucket_len not in buckets:
                buckets[bucket_len] = set()
            buckets[bucket_len].add(k)

        # Step C1: Reduce byte-length buckets to at most 32
        while len(buckets) > 32:
            byte_lengths = sorted(buckets.keys())
            concat = "|".join(str(bl) for bl in byte_lengths)
            h = int(
                hashlib.sha256(concat.encode("utf-8")).hexdigest(),
                16,
            )
            chosen_index = h % len(byte_lengths)
            if chosen_index == 0:
                chosen_index = 1
            elif chosen_index == len(byte_lengths) - 1:
                chosen_index = len(byte_lengths) - 2
            remove_bl = byte_lengths[chosen_index]
            removed_count = len(buckets[remove_bl])
            pruned_count += removed_count
            del buckets[remove_bl]

        # Step C2: Per-bucket pruning to 16 keys per bucket
        final_keys: set[str] = set()
        for _, bucket in buckets.items():
            if len(bucket) <= 16:
                final_keys.update(bucket)
            else:
                keys_in_bucket = sorted(bucket)
                while len(keys_in_bucket) > 16:
                    choice_count = len(keys_in_bucket)
                    concat = "|".join(keys_in_bucket)
                    h = int(
                        hashlib.sha256(concat.encode("utf-8")).hexdigest(),
                        16,
                    )
                    chosen_index = h % choice_count
                    if chosen_index == 0:
                        chosen_index = 1
                    elif chosen_index == choice_count - 1:
                        chosen_index = choice_count - 2
                    keys_in_bucket.pop(chosen_index)
                    pruned_count += 1
                final_keys.update(keys_in_bucket)

        keys = final_keys

    # Sort for deterministic output
    keys_sorted = list(sorted(keys))

    # Step D: Check if pipe-separated string fits in 1024 bytes
    as_string = False
    if "|" not in keys_sorted and len(keys_sorted) > 0:
        joined = "|".join(keys_sorted)
        if len(joined.encode("utf-8")) <= 1024:
            as_string = True

    return {
        "keys": keys_sorted,
        "as_string": as_string,
        "pruned_count": pruned_count,
    }


def _encode_response_payload(text: str | None) -> str | dict | None:
    """Encode a response payload string for storage.

    Returns None for trivial payloads, a plain string for small ASCII,
    a base64 dict for small non-ASCII, or an abbreviated dict for large.
    """
    if text is None:
        return None
    if not text.strip():
        return None
    stripped = text.strip()
    if stripped == "{}":
        return None

    utf8_bytes = text.encode("utf-8")
    byte_len = len(utf8_bytes)
    is_ascii = all(ord(c) < 128 for c in text)
    sha256_hex = hashlib.sha256(utf8_bytes).hexdigest()

    if byte_len <= 4096:
        if is_ascii:
            return text
        else:
            b64 = base64.b64encode(utf8_bytes).decode("ascii").rstrip("=")
            return {"type": "base64", "base64": b64}

    # --- abbreviated (> 4096 bytes) ---
    prefix_bytes = utf8_bytes[:2048]
    suffix_bytes = utf8_bytes[-2048:]

    if is_ascii:
        prefix = text[:2048]
        suffix = text[-2048:]
        encoding = "raw"
    else:
        prefix = base64.b64encode(prefix_bytes).decode("ascii").rstrip("=")
        suffix = base64.b64encode(suffix_bytes).decode("ascii").rstrip("=")
        encoding = "base64"

    # Try parsing to extract format and uniqueKeys
    unique_keys: list[str] | None = None
    fmt: str = "unknown"

    # Attempt JSON
    try:
        parsed = json.loads(text)
        fmt = "json"
        keys = _collect_unique_keys_from_obj(parsed)
        if keys:
            unique_keys = list(sorted(k for k in keys if k.isascii()))
    except (json.JSONDecodeError, TypeError, ValueError):
        # Attempt NDJSON
        if "\n" in text:
            ndjson_lines = [line for line in text.split("\n") if line.strip()]
            all_keys: set[str] = set()
            ndjson_ok = True
            for line in ndjson_lines:
                try:
                    parsed_line = json.loads(line.strip())
                    all_keys.update(_collect_unique_keys_from_obj(parsed_line))
                except (json.JSONDecodeError, TypeError, ValueError):
                    ndjson_ok = False
                    break
            if ndjson_ok and ndjson_lines and all_keys:
                fmt = "ndjson"
                unique_keys = list(sorted(k for k in all_keys if k.isascii()))
    if fmt == "unknown":
        # Attempt query string
        if "&" in text or "=" in text:
            try:
                decoded_qs = urllib.parse.unquote(text)
                qs_keys: set[str] = set()
                for pair in decoded_qs.split("&"):
                    if not pair:
                        continue
                    eq_idx = pair.index("=") if "=" in pair else -1
                    key = pair[:eq_idx] if eq_idx >= 0 else pair
                    qs_keys.add(key)
                if qs_keys:
                    fmt = "query"
                    unique_keys = list(sorted(k for k in qs_keys if k.isascii()))
            except ValueError:
                pass

    result: dict = {
        "type": "abbreviated",
        "length": byte_len,
        "encoding": encoding,
        "prefix": prefix,
        "suffix": suffix,
        "sha256": sha256_hex,
        "format": fmt,
    }
    if unique_keys is not None:
        compacted = _compact_unique_keys(unique_keys)
        if compacted["as_string"]:
            result["uniqueKeys"] = "|".join(compacted["keys"])
        else:
            result["uniqueKeys"] = compacted["keys"]
        if compacted["pruned_count"] > 0:
            result["prunedUniqueKeys"] = compacted["pruned_count"]
    ethereum = _extract_ethereum_values(text)
    if ethereum is not None:
        result["ethereum"] = ethereum
    return result


class WalletRequest:
    @classmethod
    def decode(cls, data: dict):
        def _decode_if_set(k):
            if k not in data:
                return None
            return str(data[k])

        def _decode_content(k):
            if k not in data:
                return None
            val = data[k]
            if isinstance(val, dict) and val.get("type") == "base64":
                b64 = val["base64"]
                padded = b64 + "=" * ((4 - len(b64) % 4) % 4)
                return base64.b64decode(padded).decode("utf-8")
            return str(val)

        def _decode_str_multidict(k):
            decoded: Dict[str, Tuple[str, ...]] = {}
            for key, v in data.get(k, {}).items():
                if isinstance(v, list):
                    decoded[key] = tuple(str(x) for x in v)
                else:
                    decoded[key] = (str(v),)
            return decoded

        json_rpc_method: Tuple[str, ...] = ()
        if "jsonRpcMethod" in data:
            if isinstance(data["jsonRpcMethod"], list):
                json_rpc_method = tuple(data["jsonRpcMethod"])
            else:
                json_rpc_method = (data["jsonRpcMethod"],)

        return cls(
            domain=data["domain"],
            path=data["path"],
            query=_decode_str_multidict("query"),
            json_rpc_method=json_rpc_method,
            content=_decode_content("content"),
            cookies=_decode_str_multidict("cookies"),
            referer_domain=data.get("refererDomain"),
            odd_headers=_decode_str_multidict("oddHeaders"),
            odd_trailers=_decode_str_multidict("oddTrailers"),
            session_time=data["sessionTime"],
            review=data.get("review"),
            response_status=data.get("responseStatus"),
            response_headers=_decode_str_multidict("responseOddHeaders") or None,
            response_payload=_decode_if_set("responsePayload"),
        )

    @classmethod
    def from_request(cls, req: http.Request, session_time: int):
        # Use `pretty_url`/`pretty_host` (derived from the Host header / HTTP/2
        # `:authority`) rather than `url`/`host`, which resolve to the connection
        # destination. On some setups (e.g. an Android emulator routed through an
        # upstream proxy) the latter is the raw IP address, which is useless for
        # attributing a request to an entity. `pretty_*` yields the real hostname.
        url = urllib.parse.urlparse(req.pretty_url)
        json_rpc_method: Tuple[str, ...] = ()
        text = req.get_text()
        if text is not None and text == "":
            text = None
        if text is not None:
            try:
                payload = json.loads(text)
                if not isinstance(payload, list):
                    payload = [payload]
                if all(
                    isinstance(rpc, dict)
                    and rpc.get("jsonrpc") == "2.0"
                    and isinstance(rpc.get("method"), str)
                    for rpc in payload
                ):
                    json_rpc_method = tuple(rpc["method"] for rpc in payload)
            except json.JSONDecodeError:
                pass  # Not JSON-RPC
        referer_domain: Optional[str] = None
        if "Referer" in req.headers:
            referer_domain = urllib.parse.urlparse(req.headers["Referer"]).hostname

        return cls(
            domain=url.hostname,
            path=url.path,
            query=_multidict_to_dict_of_tuples(req.query),
            json_rpc_method=json_rpc_method,
            content=text,
            cookies=_multidict_to_dict_of_tuples(req.cookies),
            referer_domain=referer_domain,
            odd_headers=_multidict_to_dict_of_tuples(
                req.headers, filter_fn=lambda k: not is_benign_header(k)
            ),
            odd_trailers=_multidict_to_dict_of_tuples(
                req.trailers, filter_fn=lambda k: not is_benign_header(k)
            )
            if req.trailers
            else {},
            session_time=session_time,
            review=None,
        )

    def __init__(
        self,
        domain: str,
        path: str,
        query: Dict[str, Tuple[str, ...]],
        json_rpc_method: Tuple[str, ...],
        content: Optional[str],
        cookies: Dict[str, Tuple[str, ...]],
        referer_domain: Optional[str],
        odd_headers: Dict[str, Tuple[str, ...]],
        odd_trailers: Dict[str, Tuple[str, ...]],
        session_time: int,
        review: Optional[object],
        response_status: Optional[int] = None,
        response_headers: Dict[str, Tuple[str, ...]] | None = None,
        response_payload: Optional[str] = None,
    ):
        self._domain = domain
        self._path = path
        self._query = query
        self._json_rpc_method = json_rpc_method
        self._content = content
        self._cookies = cookies
        self._referer_domain = referer_domain
        self._odd_headers = odd_headers
        self._odd_trailers = odd_trailers
        self._session_time = session_time
        self._review = review
        self._response_status: Optional[int] = response_status
        self._response_headers: Dict[str, Tuple[str, ...]] = (
            response_headers if response_headers is not None else {}
        )
        self._response_payload: Optional[str] = response_payload

    @classmethod
    def set_response_data(
        cls,
        wallet_request: WalletRequest,
        resp: http.Response,
    ) -> None:
        """Populate response fields on an existing WalletRequest from an HTTP response."""
        wallet_request._response_status = resp.status_code
        wallet_request._response_headers = _multidict_to_dict_of_tuples(
            resp.headers, filter_fn=lambda k: not is_benign_response_header(k)
        )
        text = resp.get_text()
        wallet_request._response_payload = text

    def __str__(self):
        def _maybe_multidict(name: str, md: Dict[str, Tuple[str, ...]]) -> str:
            if len(md) == 0:
                return ""
            values = {}
            for k, v in md.items():
                values[k] = repr(v[0] if len(v) == 1 else v)
            return (
                f" {name}={','.join(f'{k}={values[k]}' for k in sorted(values.keys()))}"
            )

        json_rpc = (
            ""
            if len(self._json_rpc_method) == 0
            else f" rpc={','.join(sorted(self._json_rpc_method))}"
        )
        referer_domain = (
            "" if self._referer_domain is None else f" referer={self._referer_domain}"
        )
        content = "" if self._content is None else f" content={self._content}"
        response_status = (
            "" if self._response_status is None else f" status={self._response_status}"
        )
        response_payload = (
            ""
            if self._response_payload is None or len(self._response_payload) == 0
            else f" resp=[{str(len(self._response_payload))} bytes]"
        )
        return (
            f"{self._domain}: {self._path}"
            f"{_maybe_multidict('query', self._query)}"
            f"{json_rpc}{content}"
            f"{_maybe_multidict('cookie', self._cookies)}"
            f"{referer_domain}"
            f"{_maybe_multidict('headers', self._odd_headers)}"
            f"{_maybe_multidict('trailers', self._odd_trailers)}"
            f"{response_status}"
            f"{_maybe_multidict('resp_headers', self._response_headers)}"
            f"{response_payload}"
        )

    def encode(self):
        data = {
            "domain": self._domain,
            "path": self._path,
            "sessionTime": self._session_time,
        }

        def _encode_multidict(name: str, md: Dict[str, Tuple[str, ...]]):
            if len(md) == 0:
                return
            encoded = {}
            for k, v in md.items():
                if len(v) == 1:
                    encoded[k] = v[0]
                else:
                    encoded[k] = list(v)
            data[name] = encoded

        _encode_multidict("query", self._query)

        if len(self._json_rpc_method) == 1:
            data["jsonRpcMethod"] = self._json_rpc_method[0]
        elif len(self._json_rpc_method) > 1:
            data["jsonRpcMethod"] = list(self._json_rpc_method)

        if self._content is not None:
            if self._content.isascii():
                data["content"] = self._content
            else:
                b64 = (
                    base64.b64encode(self._content.encode("utf-8"))
                    .decode("ascii")
                    .rstrip("=")
                )
                data["content"] = {"type": "base64", "base64": b64}

        _encode_multidict("cookies", self._cookies)

        if self._referer_domain is not None:
            data["refererDomain"] = self._referer_domain

        _encode_multidict("oddHeaders", self._odd_headers)
        _encode_multidict("oddTrailers", self._odd_trailers)

        if self._response_status is not None and self._response_status != 200:
            data["responseStatus"] = self._response_status

        _encode_multidict("responseOddHeaders", self._response_headers)

        payload_data = _encode_response_payload(self._response_payload)
        if payload_data is not None:
            data["responsePayload"] = payload_data

        if self._review is not None:
            data["review"] = self._review

        return data


class WalletCaptureFlow:
    @classmethod
    def decode(cls, flow: str, data: dict):
        flow_obj = cls(flow=flow)
        for r in data.get("requests", []):
            flow_obj._add_decoded(WalletRequest.decode(data=r))
        return flow_obj

    def __init__(self, flow: Union[UxFlow, str]):
        self._flow = flow
        self._requests: List[WalletRequest] = []
        self._needs_flushing = 0
        self._lock = threading.Lock()

    def _add_decoded(self, wallet_request: WalletRequest):
        """Add a request that was decoded from file (doesn't increment flush counter)."""
        with self._lock:
            self._requests.append(wallet_request)

    def add(self, wallet_request: WalletRequest):
        """Add a new request (increments flush counter)."""
        with self._lock:
            self._requests.append(wallet_request)
            self._needs_flushing += 1

    def notify_update(self):
        """Increments flush counter."""
        with self._lock:
            self._needs_flushing += 1

    def needs_flushing(self) -> int:
        with self._lock:
            return self._needs_flushing

    def mark_flushed(self, amount: int):
        with self._lock:
            self._needs_flushing -= amount

    def encode(self):
        with self._lock:
            return {
                "requests": [r.encode() for r in self._requests],
            }


class WalletCaptureFile:
    def __init__(self, path: str):
        self.path = path
        self._session_start = time.time()
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        if not os.path.exists(self.path):
            with open(self.path, "w") as f:
                f.write("{}")
        with open(self.path, "r") as f:
            try:
                data = json.load(f)
            except json.decoder.JSONDecodeError as e:
                if os.path.getsize(self.path) > 2:
                    raise e
                data = {}  # Empty file, reset data.
        self._identity = data.get("identity", "")
        if "userData" in data:
            self._user_data_store = UserDataStringStore.decode(data["userData"])
        else:
            self._user_data_store = UserDataStringStore.new()

        self._flows: Dict[str, Union[WalletCaptureFlow, str]] = {}
        for flow_name, flow_data in data.get("flows", {}).items():
            if isinstance(flow_data, str) and flow_data == "NOT_SUPPORTED":
                self._flows[flow_name] = "NOT_SUPPORTED"
            else:
                self._flows[flow_name] = WalletCaptureFlow.decode(
                    flow=flow_name, data=flow_data
                )

        self._session_number: int = data.get("sessions", 0) + 1
        self._needs_flushing = 0
        self._lock = threading.Lock()

    @property
    def user_data_store(self) -> UserDataStringStore:
        return self._user_data_store

    def session_time(self) -> int:
        """Session time as a session-start-relative timestamp."""
        return self._session_number * 1_000_000_000 + int(
            1_000 * (time.time() - self._session_start)
        )

    def flow(self, flow: UxFlow) -> WalletCaptureFlow:
        with self._lock:
            flow_key = str(flow)
            if flow_key not in self._flows:
                self._flows[flow_key] = WalletCaptureFlow(flow=flow)
                self._needs_flushing += 1
            elif (
                isinstance(self._flows[flow_key], str)
                and self._flows[flow_key] == "NOT_SUPPORTED"
            ):
                # Override NOT_SUPPORTED with a new flow
                self._flows[flow_key] = WalletCaptureFlow(flow=flow)
                self._needs_flushing += 1

            result = self._flows[flow_key]
            assert isinstance(result, WalletCaptureFlow)
            return result

    def flush(self):
        with self._lock:
            # Calculate total pending changes
            total_needs_flushing = (
                self._needs_flushing + self._user_data_store.needs_flushing()
            )
            for f in self._flows.values():
                if isinstance(f, WalletCaptureFlow):
                    total_needs_flushing += f.needs_flushing()

            if total_needs_flushing == 0:
                return

            logging.info(f"Flushing data to {self.path}.")

            # Capture current flush amounts
            file_flush_amount = self._needs_flushing
            user_data_flush_amount = self._user_data_store.needs_flushing()
            per_flow_amounts = [
                (f, f.needs_flushing())
                for f in self._flows.values()
                if isinstance(f, WalletCaptureFlow)
            ]

            # Serialize to string and verify ASCII-only before writing
            content = json.dumps(
                {
                    "identity": self._identity,
                    "flows": {
                        flow_name: (
                            "NOT_SUPPORTED"
                            if isinstance(flow, str) and flow == "NOT_SUPPORTED"
                            else flow.encode()
                        )
                        for flow_name, flow in self._flows.items()
                    },
                    "userData": self._user_data_store.encode(),
                    "sessions": self._session_number,
                },
                indent="\t",
                ensure_ascii=False,
            )
            if not content.isascii():
                bad_idx = next(i for i, c in enumerate(content) if ord(c) >= 128)
                context = content[max(0, bad_idx - 40) : bad_idx + 40]
                raise ValueError(
                    f"Non-ASCII character detected in JSON output for {self.path}. "
                    f"Found U+{ord(content[bad_idx]):04X} at offset {bad_idx}. "
                    f"Surrounding context: {repr(context)}"
                )

            # Write to temp file then rename for atomicity
            with open(self.path + ".tmp", "w") as f:
                f.write(content)
                f.write("\n")

            os.rename(self.path + ".tmp", self.path)

            # Mark as flushed
            self._needs_flushing -= file_flush_amount
            self._user_data_store.mark_flushing_done(user_data_flush_amount)
            for f, amount in per_flow_amounts:
                f.mark_flushed(amount)


class WalletDataCollectionAddon:
    def __init__(self):
        self._wallet_id: Optional[str] = None
        self._wallet_type: str = "software"
        self._wallet_variant: Optional[str] = None
        self._current_ux_flow: Optional[UxFlow] = None
        self._wallet_data: Optional[WalletCaptureFile] = None
        self._configured = False
        self._data_path = os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            ),
            "data",
        )
        self._lock = threading.Lock()
        self._flush_thread = None

    def _wallet_collection_path(self) -> str:
        assert self._wallet_id is not None and self._wallet_variant is not None
        return os.path.join(
            self._data_path,
            f"{self._wallet_type.lower()}-wallets",
            "collection",
            self._wallet_id.lower(),
            f"{self._wallet_id.lower()}.{self._wallet_variant.lower()}.capture.json",
        )

    def configure(self, updated: set[str]):
        logging.info(f"Processing configuration data: {', '.join(sorted(updated))}")
        if "wallet_type" in updated or ctx.options.wallet_type:
            self._wallet_type = ctx.options.wallet_type
        if "wallet_variant" in updated or ctx.options.wallet_variant:
            self._wallet_variant = ctx.options.wallet_variant
        if "wallet_id" in updated or ctx.options.wallet_id:
            self._wallet_id = ctx.options.wallet_id
        if "ux_flow" in updated or ctx.options.ux_flow:
            ux_flow_value = ctx.options.ux_flow
            if ux_flow_value:
                valid_flows = [str(f) for f in UxFlow]
                assert ux_flow_value in valid_flows, (
                    f"Invalid ux_flow: {repr(ux_flow_value)}. "
                    f"Must be one of: {', '.join(valid_flows)}."
                )
                logging.info("UX flow configured.")
                self._current_ux_flow = UxFlow[ux_flow_value]
        if (
            self._wallet_id is not None
            and self._wallet_variant is not None
            and self._wallet_type is not None
        ):
            if self._wallet_data is not None:
                assert self._wallet_data.path == self._wallet_collection_path(), (
                    "Wallet options and capture file path changed incompatibly"
                )
            else:
                self._wallet_data = WalletCaptureFile(
                    path=self._wallet_collection_path()
                )
                logging.info("Wallet capture configured.")
        if self._current_ux_flow is not None and self._wallet_data is not None:
            logging.info("Ready to capture requests.")

    def load(self, loader: Loader):
        loader.add_option("wallet_id", str, "", "Wallet ID.")
        loader.add_option(
            "wallet_type",
            str,
            "",
            "Wallet type (software, hardware, embedded).",
        )
        loader.add_option("wallet_variant", str, "", "Wallet variant.")
        loader.add_option(
            "ux_flow",
            str,
            "",
            f"Wallet UX flow being exercised. Must be one of: {', '.join(str(f) for f in UxFlow)}.",
        )

    def running(self):
        self.configure(set())
        with self._lock:
            if self._flush_thread is None:
                self._flush_thread = threading.Thread(
                    target=self._background, daemon=True
                )
                self._flush_thread.start()

    def _background(self):
        running = True
        while running:
            time.sleep(0.2)
            if self._wallet_data is not None:
                self._wallet_data.flush()
            with self._lock:
                running = self._flush_thread is not None

    def done(self):
        thr = None
        with self._lock:
            if self._flush_thread is not None:
                thr = self._flush_thread
                self._flush_thread = None

        if thr is not None:
            thr.join()

        if self._wallet_data is not None:
            self._wallet_data.flush()

    def request(self, flow: http.HTTPFlow) -> None:
        assert self._wallet_data is not None and self._current_ux_flow is not None, (
            f"Received a request before being fully configured! (wallet_data={str(self._wallet_data)}, current_ux_flow={str(self._current_ux_flow)})"
        )
        req = flow.request
        req.anticache()
        req.constrain_encoding()
        wallet_data_req = WalletRequest.from_request(
            req=req,
            session_time=self._wallet_data.session_time(),
        )
        # Stash on the flow so response() can retrieve the correct match
        flow._wallet_data_req = wallet_data_req  # type: ignore[attr-defined]
        self._wallet_data.flow(self._current_ux_flow).add(wallet_data_req)

    def response(self, flow: http.HTTPFlow) -> None:
        assert self._wallet_data is not None and self._current_ux_flow is not None
        wallet_data_req = getattr(flow, "_wallet_data_req", None)
        assert wallet_data_req is not None, (
            "Got a mitmproxy HTTP flow without associated wallet_data_req"
        )
        assert flow.response is not None, (
            "No response data on mitmproxy HTTP flow object during response handling"
        )
        WalletRequest.set_response_data(wallet_data_req, flow.response)
        self._wallet_data.flow(self._current_ux_flow).notify_update()
        logging.info("[%s] %s", flow.request.pretty_host, wallet_data_req)


addons = [WalletDataCollectionAddon()]
