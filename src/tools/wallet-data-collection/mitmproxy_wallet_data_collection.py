from __future__ import annotations

import enum
import json
import hashlib
import logging
import os
import random
import string
import time
import threading
import urllib.parse
from typing import Set, Tuple, Dict, Optional, FrozenSet, List, Union

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
        "User-Agent",
        "Cookie",  # Handled separately
        "Host",
        "Accept",
        "Accept-Encoding",
        "Accept-Language",
        "Cache-Control",
        "Content-Length",
        "Content-Type",
        "Upgrade-Insecure-Requests",
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
        "Connection",
        "Origin",
        "Sec-Fetch-Dest",
        "Pragma",
        "Upgrade",
        "User-Agent",
        "Sec-WebSocket-Version",
        "Sec-WebSocket-Key",
        "Sec-WebSocket-Extensions",
    )
)


def is_benign_header(header: str) -> bool:
    return header.lower() in _KNOWN_BENIGN_HEADERS


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


class RedactedData:
    @classmethod
    def decode(cls, redactor: RedactedStringStore, data: dict):
        pieces: Set[UserInfo] = set()
        if "piece" in data:
            pieces.add(UserInfo[data["piece"]])
        if "pieces" in data:
            for p in data["pieces"]:
                pieces.add(UserInfo[p])

        return cls(
            redactor=redactor,
            label_prefix=data["labelPrefix"],
            label_index=data["labelIndex"],
            real_str=None,
            hash_value=data["hash"],
            orig_hash=data.get("origHash"),
            pieces=frozenset(pieces),
            hint=data.get("hint"),
            length=data["length"],
            first_char=data["firstChar"],
        )

    def __init__(
        self,
        redactor: RedactedStringStore,
        label_prefix: str,
        label_index: int,
        real_str: Optional[str],
        hash_value: str,
        orig_hash: Optional[str],
        pieces: FrozenSet[UserInfo],
        hint: Optional[str],
        length: int,
        first_char: Optional[str] = None,
    ):
        self._redactor = redactor
        self.label_prefix = label_prefix
        self.label_index = label_index
        self.real_str = real_str
        self.hash = hash_value
        self.orig_hash = orig_hash if orig_hash is not None else self.hash
        self.pieces = pieces
        self.hint = hint
        self.length = len(real_str) if real_str is not None else length

        if first_char is not None:
            self.first_char = first_char.lower()
        elif real_str is not None and len(real_str) > 0:
            self.first_char = real_str[0].lower()
        else:
            raise ValueError("Must provide either real_str or first_char")

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        return (
            self.label_prefix == other.label_prefix
            and self.label_index == other.label_index
        )

    def __hash__(self):
        return hash((self.label_prefix, self.label_index))

    @property
    def label(self) -> str:
        return f"{self.label_prefix}_{self.label_index}"

    def augment(
        self,
        real_str: Optional[str] = None,
        orig_hash: Optional[str] = None,
        pieces: Optional[FrozenSet[UserInfo]] = None,
        hint: Optional[str] = None,
    ) -> bool:
        changed = False

        if real_str is not None:
            assert self.real_str is None or self.real_str == real_str, "Hash collision"
            assert len(real_str) == self.length, "Length mismatch"
            assert real_str[0].lower() == self.first_char, "First character mismatch"
            changed = changed or self.real_str != real_str
            self.real_str = real_str

        if orig_hash is not None:
            assert self.orig_hash == self.hash or self.orig_hash == orig_hash, (
                "Mismatching orig_hash"
            )
            changed = changed or self.orig_hash != orig_hash
            self.orig_hash = orig_hash

        if pieces is not None:
            new_pieces = set(self.pieces)
            for p in pieces:
                if p not in new_pieces:
                    new_pieces.add(p)
                    changed = True
            if changed:
                self.pieces = frozenset(new_pieces)

        if hint is not None:
            assert self.hint is None or self.hint == hint, "Conflicting hint"
            if self.hint != hint:
                changed = True
                self.hint = hint

        return changed

    def encode(self) -> dict:
        data = {
            "labelPrefix": self.label_prefix,
            "labelIndex": self.label_index,
            "hash": self.hash,
            "length": self.length,
            "firstChar": self.first_char,
        }

        sorted_pieces = list(sorted(str(p) for p in self.pieces))
        if len(sorted_pieces) == 1:
            data["piece"] = sorted_pieces[0]
        elif len(sorted_pieces) > 1:
            data["pieces"] = sorted_pieces
        if self.orig_hash != self.hash:
            data["origHash"] = self.orig_hash
        if self.hint is not None:
            data["hint"] = self.hint

        return data


class RedactedStringStore:
    @classmethod
    def decode(cls, data: dict) -> RedactedStringStore:
        redactor = cls(salt=data["salt"])

        for redaction_data in data.get("redactions", []):
            redaction = RedactedData.decode(redactor=redactor, data=redaction_data)
            key = (redaction.label_prefix, redaction.label_index)

            redactor._redactions[key] = redaction
            redactor._hash_to_label[redaction.hash] = key

            # Update label_next_index
            current_next = redactor._label_next_index.get(redaction.label_prefix, 1)
            if redaction.label_index >= current_next:
                redactor._label_next_index[redaction.label_prefix] = (
                    redaction.label_index + 1
                )

            # Track length and first_char for efficient scanning
            redactor._register_length_and_first_char(
                redaction.length, redaction.first_char
            )

        return redactor

    @classmethod
    def new(cls) -> RedactedStringStore:
        return cls(
            salt="".join(random.choice(string.ascii_lowercase) for _ in range(32))
        )

    def __init__(self, salt: str):
        self._lock = threading.Lock()
        self._salt = salt
        self._label_next_index: Dict[str, int] = {}
        self._hash_to_label: Dict[str, Tuple[str, int]] = {}
        self._redactions: Dict[Tuple[str, int], RedactedData] = {}
        self._lengths: Tuple[int, ...] = ()
        self._length_to_first_chars: Dict[int, Set[str]] = {}
        self._needs_flushing = 0

    def _register_length_and_first_char(self, length: int, first_char: str):
        """Register a length and first character for efficient scanning."""
        first_char = first_char.lower()
        if length not in self._length_to_first_chars:
            self._length_to_first_chars[length] = set()
            self._lengths = tuple(
                sorted(self._length_to_first_chars.keys(), reverse=True)
            )
        self._length_to_first_chars[length].add(first_char)

    def needs_flushing(self) -> int:
        with self._lock:
            return self._needs_flushing

    def mark_flushed(self, amount: int):
        with self._lock:
            self._needs_flushing -= amount

    def encode(self) -> dict:
        with self._lock:
            return {
                "salt": self._salt,
                "redactions": [
                    self._redactions[k].encode()
                    for k in sorted(self._redactions.keys())
                ],
            }

    def _hash(self, s: str) -> str:
        h = hashlib.sha256()
        h.update(self._salt.encode("utf-8"))
        h.update(s.encode("utf-8"))
        return h.hexdigest()

    def redact(
        self, string: str, escape_char: Optional[str] = None
    ) -> Tuple[str, FrozenSet[RedactedData]]:
        assert not string.startswith("~R:"), (
            "String was already redacted, cannot redact twice."
        )

        if escape_char is None:
            escape_char = RedactedString.pick_escape_char(string)

        with self._lock:
            lengths = tuple(self._lengths)
            length_to_first_chars = {
                k: set(v) for k, v in self._length_to_first_chars.items()
            }

        redactions: Set[RedactedData] = set()

        def _round(s: str) -> str:
            is_redaction = False
            offset_from_start = 0

            for component in s.split(escape_char):
                if not is_redaction:
                    for relevant_len in lengths:
                        if len(component) < relevant_len:
                            continue
                        relevant_first_chars = length_to_first_chars.get(
                            relevant_len, set()
                        )
                        for offset in range(0, len(component) - relevant_len + 1):
                            first_char = component[offset].lower()
                            if first_char not in relevant_first_chars:
                                continue
                            substr = component[offset : offset + relevant_len]
                            for variant in (substr, substr.lower()):
                                h = self._hash(variant)
                                relevant_label = self._hash_to_label.get(h)
                                if relevant_label is None:
                                    continue
                                with self._lock:
                                    redaction = self._redactions[relevant_label]
                                    if redaction.augment(real_str=variant):
                                        self._needs_flushing += 1
                                redactions.add(redaction)
                                label_str = f"{relevant_label[0]}_{relevant_label[1]}"
                                return (
                                    s[: offset_from_start + offset]
                                    + f"{escape_char}{label_str}{escape_char}"
                                    + s[offset_from_start + offset + relevant_len :]
                                )
                else:
                    parts = component.split("_", 1)
                    if len(parts) == 2:
                        label_prefix = parts[0]
                        try:
                            label_index = int(parts[1])
                            with self._lock:
                                if (label_prefix, label_index) in self._redactions:
                                    redaction = self._redactions[
                                        (label_prefix, label_index)
                                    ]
                                    redactions.add(redaction)
                        except ValueError:
                            raise ValueError(f"Invalid label: {component}")

                is_redaction = not is_redaction
                offset_from_start += len(component) + len(escape_char)

            return s

        new_string = _round(string)
        while new_string != string:
            string = new_string
            new_string = _round(string)

        return string, frozenset(redactions)


class RedactedString:
    _POSSIBLE_ESCAPE_CHARS = "~+!@#$%^&*:;?.,`|-/"

    @classmethod
    def pick_escape_char(cls, real_str: str) -> str:
        for c in cls._POSSIBLE_ESCAPE_CHARS:
            if c not in real_str:
                return c
        raise ValueError("Cannot find an escape character in string: %r" % (real_str,))

    @classmethod
    def from_real(cls, real_str: str, redactor: RedactedStringStore) -> RedactedString:
        escape_char = cls.pick_escape_char(real_str)
        return cls(
            redactor=redactor,
            redacted_str=f"~R:{escape_char}{real_str}",
        )

    @classmethod
    def decode(
        cls, encoded_redacted_str: str, redactor: RedactedStringStore
    ) -> RedactedString:
        return cls(redactor=redactor, redacted_str=encoded_redacted_str)

    def __init__(self, redactor: RedactedStringStore, redacted_str: str):
        assert redacted_str.startswith("~R:") and len(redacted_str) >= 4
        self._redactor = redactor
        self._escape_character = redacted_str[3]
        self._payload = redacted_str[4:]

    def __str__(self):
        return self.encode()

    def __repr__(self):
        return repr(str(self))

    def encode(self) -> str:
        redacted, _ = self._redactor.redact(
            string=self._payload, escape_char=self._escape_character
        )
        return f"~R:{self._escape_character}{redacted}"


class WalletCaptureContext(enum.StrEnum):
    COOKIE = "COOKIE"
    OTHER_HEADER = "OTHER_HEADER"
    QUERY = "QUERY"
    POST_BODY = "POST_BODY"


class UserDataPieces:
    @classmethod
    def decode(
        cls, redactor: RedactedStringStore, data: Union[dict, str]
    ) -> UserDataPieces:
        if isinstance(data, str):
            pieces: Set[UserInfo] = set()
            encoded_redacted_str = data
        else:
            pieces_list = []
            if "pieces" in data:
                pieces_list = data["pieces"]
            elif "piece" in data:
                pieces_list = [data["piece"]]

            pieces = set(UserInfo[p] for p in pieces_list)
            encoded_redacted_str = data["sample"]

        return cls(
            pieces=frozenset(pieces),
            sample=RedactedString.decode(
                encoded_redacted_str=encoded_redacted_str, redactor=redactor
            ),
        )

    @classmethod
    def classify_str(
        cls, data: str, redactor: RedactedStringStore, context: WalletCaptureContext
    ) -> UserDataPieces:
        return cls(
            pieces=frozenset(),
            sample=RedactedString.from_real(real_str=data, redactor=redactor),
        )

    @classmethod
    def classify_multidict(
        cls,
        data: Dict[str, Union[str, List[str]]],
        redactor: RedactedStringStore,
        context: WalletCaptureContext,
    ) -> Dict[str, Tuple[UserDataPieces, ...]]:
        classified = {}
        for k, v in data.items():
            if isinstance(v, list):
                classified[k] = tuple(
                    cls.classify_str(data=s, redactor=redactor, context=context)
                    for s in v
                )
            else:
                classified[k] = (
                    cls.classify_str(data=v, redactor=redactor, context=context),
                )
        return classified

    def __init__(self, pieces: FrozenSet[UserInfo], sample: RedactedString):
        self._pieces = pieces
        self._sample = sample

    def __str__(self):
        if len(self._pieces) == 0:
            return f"{repr(self._sample)} [no user data]"
        return (
            f"{repr(self._sample)} [{' '.join(sorted(str(p) for p in self._pieces))}]"
        )

    def __repr__(self):
        return str(self)

    def encode(self):
        if len(self._pieces) == 0:
            return self._sample.encode()

        data = {
            "sample": self._sample.encode(),
        }

        sorted_pieces = list(sorted(str(p) for p in self._pieces))
        if len(sorted_pieces) == 1:
            data["piece"] = sorted_pieces[0]
        else:
            data["pieces"] = sorted_pieces

        return data


def _multidict_to_dict_of_lists(multidict, filter_fn=None) -> Dict[str, List[str]]:
    """Convert a MultiDictView to Dict[str, List[str]], preserving all values."""
    result: Dict[str, List[str]] = {}
    items = multidict.items(multi=True) if hasattr(multidict, "items") else []
    for k, v in items:
        if filter_fn is not None and not filter_fn(k):
            continue
        if k not in result:
            result[k] = []
        result[k].append(v)
    return result


class WalletRequest:
    @classmethod
    def decode(cls, data: dict, redactor: RedactedStringStore):
        def _decode_if_set(k):
            if k not in data:
                return None
            return UserDataPieces.decode(redactor=redactor, data=data[k])

        def _decode_str_multidict(k):
            decoded = {}
            for key, v in data.get(k, {}).items():
                if isinstance(v, list):
                    decoded[key] = tuple(
                        UserDataPieces.decode(redactor=redactor, data=x) for x in v
                    )
                else:
                    decoded[key] = (UserDataPieces.decode(redactor=redactor, data=v),)
            return decoded

        json_rpc_method: Tuple[str, ...] = ()
        if "jsonRpcMethod" in data:
            if isinstance(data["jsonRpcMethod"], list):
                json_rpc_method = tuple(data["jsonRpcMethod"])
            else:
                json_rpc_method = (data["jsonRpcMethod"],)

        return cls(
            redactor=redactor,
            domain=data["domain"],
            path=data["path"],
            query=_decode_str_multidict("query"),
            json_rpc_method=json_rpc_method,
            content=_decode_if_set("content"),
            cookies=_decode_str_multidict("cookies"),
            referer_domain=data.get("refererDomain"),
            odd_headers=_decode_str_multidict("oddHeaders"),
            odd_trailers=_decode_str_multidict("oddTrailers"),
            session_time=data["sessionTime"],
            review=data.get("review"),
        )

    @classmethod
    def from_request(
        cls, redactor: RedactedStringStore, req: http.Request, session_time: int
    ):
        url = urllib.parse.urlparse(req.url)
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
            redactor=redactor,
            domain=url.hostname,
            path=url.path,
            query=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(req.query),
                redactor=redactor,
                context=WalletCaptureContext.QUERY,
            ),
            json_rpc_method=json_rpc_method,
            content=(
                UserDataPieces.classify_str(
                    text, redactor=redactor, context=WalletCaptureContext.POST_BODY
                )
                if text is not None
                else None
            ),
            cookies=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(req.cookies),
                redactor=redactor,
                context=WalletCaptureContext.COOKIE,
            ),
            referer_domain=referer_domain,
            odd_headers=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(
                    req.headers, filter_fn=lambda k: not is_benign_header(k)
                ),
                redactor=redactor,
                context=WalletCaptureContext.OTHER_HEADER,
            ),
            odd_trailers=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(
                    req.trailers, filter_fn=lambda k: not is_benign_header(k)
                )
                if req.trailers
                else {},
                redactor=redactor,
                context=WalletCaptureContext.OTHER_HEADER,
            ),
            session_time=session_time,
            review=None,
        )

    def __init__(
        self,
        redactor: RedactedStringStore,
        domain: str,
        path: str,
        query: Dict[str, Tuple[UserDataPieces, ...]],
        json_rpc_method: Tuple[str, ...],
        content: Optional[UserDataPieces],
        cookies: Dict[str, Tuple[UserDataPieces, ...]],
        referer_domain: Optional[str],
        odd_headers: Dict[str, Tuple[UserDataPieces, ...]],
        odd_trailers: Dict[str, Tuple[UserDataPieces, ...]],
        session_time: int,
        review: Optional[object],
    ):
        self._redactor = redactor
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

    def __str__(self):
        def _maybe_multidict(
            name: str, md: Dict[str, Tuple[UserDataPieces, ...]]
        ) -> str:
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
        content = "" if self._content is None else f" content={str(self._content)}"
        return (
            f"{self._domain}: {self._path}"
            f"{_maybe_multidict('query', self._query)}"
            f"{json_rpc}{content}"
            f"{_maybe_multidict('cookie', self._cookies)}"
            f"{referer_domain}"
            f"{_maybe_multidict('headers', self._odd_headers)}"
            f"{_maybe_multidict('trailers', self._odd_trailers)}"
        )

    def encode(self):
        data = {
            "domain": self._domain,
            "path": self._path,
            "sessionTime": self._session_time,
        }

        def _encode_multidict(name: str, md: Dict[str, Tuple[UserDataPieces, ...]]):
            if len(md) == 0:
                return
            encoded = {}
            for k, v in md.items():
                if len(v) == 1:
                    encoded[k] = v[0].encode()
                else:
                    encoded[k] = [x.encode() for x in v]
            data[name] = encoded

        _encode_multidict("query", self._query)

        if len(self._json_rpc_method) == 1:
            data["jsonRpcMethod"] = self._json_rpc_method[0]
        elif len(self._json_rpc_method) > 1:
            data["jsonRpcMethod"] = list(self._json_rpc_method)

        if self._content is not None:
            data["content"] = self._content.encode()

        _encode_multidict("cookies", self._cookies)

        if self._referer_domain is not None:
            data["refererDomain"] = self._referer_domain

        _encode_multidict("oddHeaders", self._odd_headers)
        _encode_multidict("oddTrailers", self._odd_trailers)

        if self._review is not None:
            data["review"] = self._review

        return data


class WalletCaptureFlow:
    @classmethod
    def decode(cls, redactor: RedactedStringStore, flow: str, data: dict):
        flow_obj = cls(flow=flow, redactor=redactor)
        for r in data.get("requests", []):
            flow_obj._add_decoded(WalletRequest.decode(data=r, redactor=redactor))
        return flow_obj

    def __init__(self, flow: Union[UxFlow, str], redactor: RedactedStringStore):
        self._flow = flow
        self._redactor = redactor
        self._requests: List[WalletRequest] = []
        self._needs_flushing = 0
        self._lock = threading.Lock()

    @property
    def redactor(self) -> RedactedStringStore:
        return self._redactor

    def _add_decoded(self, wallet_request: WalletRequest):
        """Add a request that was decoded from file (doesn't increment flush counter)."""
        with self._lock:
            self._requests.append(wallet_request)

    def add(self, wallet_request: WalletRequest):
        """Add a new request (increments flush counter)."""
        with self._lock:
            self._requests.append(wallet_request)
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
        self._identity = data["identity"]
        if "redactions" in data:
            self._redactor = RedactedStringStore.decode(data["redactions"])
        else:
            self._redactor = RedactedStringStore.new()

        self._flows: Dict[str, Union[WalletCaptureFlow, str]] = {}
        for flow_name, flow_data in data.get("flows", {}).items():
            if isinstance(flow_data, str) and flow_data == "NOT_SUPPORTED":
                self._flows[flow_name] = "NOT_SUPPORTED"
            else:
                self._flows[flow_name] = WalletCaptureFlow.decode(
                    redactor=self._redactor, flow=flow_name, data=flow_data
                )

        self._session_number: int = data.get("sessions", 0) + 1
        self._needs_flushing = 0
        self._lock = threading.Lock()

    @property
    def redactor(self) -> RedactedStringStore:
        return self._redactor

    def session_time(self) -> int:
        """Session time as a session-start-relative timestamp."""
        return self._session_number * 1_000_000_000 + int(
            1_000 * (time.time() - self._session_start)
        )

    def flow(self, flow: UxFlow) -> WalletCaptureFlow:
        with self._lock:
            flow_key = str(flow)
            if flow_key not in self._flows:
                self._flows[flow_key] = WalletCaptureFlow(
                    flow=flow, redactor=self._redactor
                )
                self._needs_flushing += 1
            elif (
                isinstance(self._flows[flow_key], str)
                and self._flows[flow_key] == "NOT_SUPPORTED"
            ):
                # Override NOT_SUPPORTED with a new flow
                self._flows[flow_key] = WalletCaptureFlow(
                    flow=flow, redactor=self._redactor
                )
                self._needs_flushing += 1

            result = self._flows[flow_key]
            assert isinstance(result, WalletCaptureFlow)
            return result

    def flush(self):
        with self._lock:
            # Calculate total pending changes
            total_needs_flushing = (
                self._needs_flushing + self._redactor.needs_flushing()
            )
            for f in self._flows.values():
                if isinstance(f, WalletCaptureFlow):
                    total_needs_flushing += f.needs_flushing()

            if total_needs_flushing == 0:
                return

            logging.info(f"Flushing data to {self.path}.")

            # Capture current flush amounts
            file_flush_amount = self._needs_flushing
            redactor_flush_amount = self._redactor.needs_flushing()
            per_flow_amounts = [
                (f, f.needs_flushing())
                for f in self._flows.values()
                if isinstance(f, WalletCaptureFlow)
            ]

            # Write to temp file then rename for atomicity
            with open(self.path + ".tmp", "w") as f:
                json.dump(
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
                        "redactions": self._redactor.encode(),
                        "sessions": self._session_number,
                    },
                    f,
                    indent="\t",
                )
                f.write("\n")

            os.rename(self.path + ".tmp", self.path)

            # Mark as flushed
            self._needs_flushing -= file_flush_amount
            self._redactor.mark_flushed(redactor_flush_amount)
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

    def configure(self, updated):
        logging.info(f"Processing configuration data: {dict(updated)}")
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
        self.configure({})
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
        host = req.host
        req.anticache()
        req.constrain_encoding()
        wallet_data_req = WalletRequest.from_request(
            redactor=self._wallet_data.redactor,
            req=req,
            session_time=self._wallet_data.session_time(),
        )
        self._wallet_data.flow(self._current_ux_flow).add(wallet_data_req)
        logging.info("[%s] %s", host, wallet_data_req)


addons = [WalletDataCollectionAddon()]
