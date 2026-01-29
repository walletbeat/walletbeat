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


class WalletCaptureFile:
    def __init__(self, path: str):
        self._path = path
        self._session_start = time.time()
        os.makedirs(os.path.dirname(self._path), exist_ok=True)
        if not os.path.exists(self._path):
            with open(self._path, "w") as f:
                f.write("{}")
        with open(self._path, "r") as f:
            try:
                data = json.load(f)
            except json.decoder.JSONDecodeError as e:
                if os.path.getsize(self._path) > 2:
                    raise e
                data = {}  # Empty file, reset data.

        self._flows: Dict[str, Union[WalletCaptureFlow, str]] = {}
        for flow_name, flow_data in data.get("flows", {}).items():
            if isinstance(flow_data, str) and flow_data == "NOT_SUPPORTED":
                self._flows[flow_name] = "NOT_SUPPORTED"
            else:
                self._flows[flow_name] = WalletCaptureFlow.decode(
                    wallet_data=self, flow=flow_name, data=flow_data
                )
        self._session_number: int = data.get("sessions", 0) + 1
        self._needs_flushing = 0
        self._lock = threading.Lock()

    def session_time(self) -> int:
        """Session time as a session-start-relative timestamp."""
        return self._session_number * 1_000_000_000 + int(
            1_000 * (time.time() - self._session_start)
        )

    def flow(self, flow: UxFlow) -> WalletCaptureFlow:
        with self._lock:
            # Convert enum to string for dict key consistency
            flow_key = str(flow)
            if flow_key not in self._flows or (
                isinstance(self._flows[flow_key], str)
                and self._flows[flow_key] == "NOT_SUPPORTED"
            ):
                self._flows[flow_key] = WalletCaptureFlow(
                    wallet_data=self, flow=flow, redactor=RedactedStringStore.new()
                )
                self._needs_flushing += 1
            return self._flows[flow_key]

    def flush(self):
        with self._lock:
            if self._needs_flushing == 0 and all(
                flow.needs_flushing() == 0
                for flow in self._flows.values()
                if isinstance(flow, WalletCaptureFlow)
            ):
                return
            logging.info(f"Flushing data to {self._path}.")
            per_flow_amounts = tuple(
                (flow, flow.needs_flushing())
                for flow in self._flows.values()
                if isinstance(flow, WalletCaptureFlow)
            )
            with open(self._path + ".tmp", "w") as f:
                json.dump(
                    {
                        "flows": {
                            flow_name: "NOT_SUPPORTED"
                            if isinstance(flow, str) and flow == "NOT_SUPPORTED"
                            else flow.encode()
                            for flow_name, flow in self._flows.items()
                        },
                        "sessions": self._session_number,
                    },
                    f,
                    indent=2,
                )
            os.rename(self._path + ".tmp", self._path)
            self._needs_flushing = 0
            for flow, per_flow_amount in per_flow_amounts:
                flow.mark_flushed(per_flow_amount)


class WalletCaptureFlow:
    @classmethod
    def decode(cls, wallet_data: WalletCaptureFile, flow: str, data: dict):
        redactor = RedactedStringStore.decode(data["redactor"])
        flow_obj = cls(wallet_data=wallet_data, flow=flow, redactor=redactor)
        for r in data["requests"]:
            flow_obj.add(WalletRequest.decode(data=r, flow=flow_obj))
        flow_obj._needs_flushing = 0
        return flow_obj

    def __init__(
        self,
        wallet_data: WalletCaptureFile,
        flow: Union[UxFlow, str],
        redactor: RedactedStringStore,
    ):
        self._wallet_data = wallet_data
        self._flow = flow
        self._requests: List[WalletRequest] = []
        self._redactor = redactor
        self._needs_flushing = 0
        self._lock = threading.Lock()

    @property
    def wallet_data(self) -> WalletCaptureFile:
        return self._wallet_data

    @property
    def redactor(self) -> RedactedStringStore:
        return self._redactor

    def add(self, wallet_request: WalletRequest):
        with self._lock:
            self._requests.append(wallet_request)
            self._needs_flushing += 1

    def needs_flushing(self) -> int:
        with self._lock:
            return (
                self._needs_flushing * 1_000_000_000_000
                + self._redactor.needs_flushing()
            )

    def mark_flushed(self, amount: int):
        with self._lock:
            self._needs_flushing -= amount // 1_000_000_000_000
            self._redactor.mark_flushed(amount=amount % 1_000_000_000_000)

    def encode(self):
        with self._lock:
            return {
                "requests": [r.encode() for r in self._requests],
                "redactor": self._redactor.encode(),
            }


class RedactedString:
    _POSSIBLE_ESCAPE_CHARS = "~+!@#$%^&*:;?.,`|-/"

    @classmethod
    def pick_escape_char(cls, real_str: str) -> str:
        chosen_escape_char = None
        for c in cls._POSSIBLE_ESCAPE_CHARS:
            if c not in real_str:
                chosen_escape_char = c
                break
        if chosen_escape_char is None:
            raise ValueError(
                "Cannot find an escape character in string: %r" % (real_str,)
            )
        return chosen_escape_char

    @classmethod
    def from_real(cls, real_str: str, redactor: RedactedStringStore) -> RedactedString:
        return cls(
            redactor=redactor,
            redacted_str=f"~R:{cls.pick_escape_char(real_str)}{real_str}",
        )

    @classmethod
    def decode(
        cls, encoded_redacted_str: str, redactor: RedactedStringStore
    ) -> RedactedString:
        return cls(redactor=redactor, redacted_str=encoded_redacted_str)

    def __init__(self, redactor: RedactedStringStore, redacted_str: str):
        assert redacted_str.startswith("~R:")
        self._redactor = redactor
        self._escape_character = redacted_str[3]
        self._redacted_str = redacted_str[4:]

    def __str__(self):
        return self.encode()

    def __repr__(self):
        return repr(str(self))

    def encode(self) -> str:
        redacted, _ = self._redactor.redact(
            string=self._redacted_str, escape_char=self._escape_character
        )
        return f"~R:{self._escape_character}{redacted}"


class RedactedData:
    @classmethod
    def decode(cls, redactor: RedactedStringStore, data: dict):
        pieces = set()
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
            hash=data["hash"],
            pieces=frozenset(pieces),
            hint=data.get("hint"),
            length=data["length"],
        )

    def __init__(
        self,
        redactor: RedactedStringStore,
        label_prefix: str,
        label_index: int,
        real_str: Optional[str],
        hash: str,
        pieces: FrozenSet[UserInfo],
        hint: Optional[str],
        length: int,
    ):
        self._redactor = redactor
        self.label_prefix = label_prefix
        self.label_index = label_index
        self.real_str = real_str
        self.hash = hash
        self.pieces = pieces
        self.hint = hint
        self.length = len(real_str) if real_str is not None else length

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        return (
            self.label_prefix == other.label_prefix
            and self.label_index == other.label_index
        )

    def __hash__(self):
        return hash((self.label_prefix, self.label_index))

    def augment(
        self,
        real_str: Optional[str] = None,
        pieces: Optional[FrozenSet[UserInfo]] = None,
        hint: Optional[str] = None,
    ) -> bool:
        changed = False
        if real_str is not None:
            assert self.real_str is None or self.real_str == real_str, "Hash collision"
            assert len(real_str) == self.length, "Length mismatch"
            self.real_str = real_str

        if pieces is not None:
            for p in pieces:
                if p not in self.pieces:
                    self.pieces.add(p)
                    changed = True

        if hint is not None:
            assert self.hint is None or self.hint == hint, "Conflicting hint"
            self.hint = hint
            changed = True
        return changed

    def encode(self):
        data = {
            "labelPrefix": self.label_prefix,
            "labelIndex": self.label_index,
            "hash": self.hash,
            "length": self.length,
        }

        sorted_pieces = list(sorted(str(p) for p in self.pieces))
        if len(sorted_pieces) == 1:
            data["piece"] = sorted_pieces[0]
        elif len(sorted_pieces) > 1:
            data["pieces"] = sorted_pieces

        if self.hint is not None:
            data["hint"] = self.hint
        return data


class RedactedStringStore:
    @classmethod
    def decode(cls, data):
        redactor = cls(salt=data["salt"])
        for redaction in data["redactions"]:
            redaction = RedactedData.decode(
                redactor=redactor,
                data=redaction,
            )
            redactor._redactions[(redaction.label_prefix, redaction.label_index)] = (
                redaction
            )
        return redactor

    @classmethod
    def new(cls):
        return cls(
            salt="".join(random.choice(string.ascii_lowercase) for i in range(32))
        )

    def __init__(self, salt: str):
        self._lock = threading.Lock()
        self._salt = salt
        self._label_next_index: Dict[str, int] = {}
        self._hash_to_label: Dict[str, Tuple[str, int]] = {}
        self._redactions: Dict[Tuple[str, int], RedactedData] = {}
        self._lengths: Tuple[int, ...] = ()
        self._needs_flushing = 0

    def needs_flushing(self) -> int:
        with self._lock:
            return self._needs_flushing

    def mark_flushed(self, amount: int):
        with self._lock:
            self._needs_flushing -= amount

    def encode(self) -> dict:
        return {
            "salt": self._salt,
            "redactions": list(
                self._redactions[k].encode() for k in sorted(self._redactions.keys())
            ),
        }

    def _hash(self, s: str) -> str:
        h = hashlib.sha256()
        h.update(self._salt.encode("utf-8"))
        h.update(s.encode("utf-8"))
        return h.hexdigest()

    def add(
        self,
        real_str: str,
        label_prefix: str,
        piece: Optional[UserInfo],
        hint: Optional[str],
    ) -> RedactedData:
        assert len(real_str) > 0, "Tried to add empty string"
        h = self._hash(real_str)
        new_pieces = frozenset((piece,)) if piece is not None else frozenset()
        with self._lock:
            if h in self._hash_to_label:
                data = self._redactions[self._hash_to_label[h]]
                if data.augment(real_str=real_str, pieces=new_pieces, hint=hint):
                    self._needs_flushing += 1
                return data
            label_index = self._label_next_index.get(label_prefix, 1)
            data = RedactedData(
                redactor=self,
                label_prefix=label_prefix,
                label_index=label_index,
                real_str=real_str,
                hash=h,
                pieces=new_pieces,
                hint=hint,
                length=len(real_str),
            )
            self._redactions[(label_prefix, label_index)] = data
            self._hash_to_label[h] = (label_prefix, label_index)
            self._label_next_index[label_prefix] = label_index + 1
            self._needs_flushing += 1
            if data.length not in self._lengths:
                self._lengths = tuple(
                    sorted(self._lengths + (data.length,), reverse=True)
                )
            return data

    def redact(
        self, string: str, escape_char: Optional[str] = None
    ) -> Tuple[str, FrozenSet[RedactedData]]:
        assert not string.startswith("~R:"), (
            "String was already redacted, cannot redact twice."
        )
        if escape_char is None:
            escape_char = RedactedString.pick_escape_char(string)
        lengths = None
        with self._lock:
            lengths = tuple(self._lengths)
        redactions: Set[RedactedData] = set()

        def _round(s: str) -> str:
            is_redaction = False
            offset_from_start = 0
            for component in s.split(escape_char):
                if not is_redaction:
                    for relevant_len in lengths:
                        if len(component) < relevant_len:
                            continue
                        for offset in range(0, len(component) - relevant_len + 1):
                            substr = component[offset : offset + relevant_len]
                            relevant_label = self._hash_to_label.get(
                                self._hash(substr), None
                            )
                            if relevant_label is None:
                                continue
                            with self._lock:
                                redaction = self._redactions[relevant_label]
                                if redaction.augment(real_str=substr):
                                    self._needs_flushing += 1
                            redactions.add(redaction)
                            return (
                                s[: offset_from_start + offset]
                                + f"{escape_char}{relevant_label[0]}_{str(relevant_label[1])}{escape_char}"
                                + s[offset_from_start + offset + relevant_len :]
                            )
                else:
                    label_prefix, label_index_str = component.split("_", 2)
                    label_index = int(label_index_str)
                    with self._lock:
                        if (label_prefix, label_index) in self._redactions:
                            redaction = self._redactions[(label_prefix, label_index)]
                            redactions.add(redaction)

                is_redaction = not is_redaction
                offset_from_start += len(component) + len(escape_char)
            return s

        new_string = _round(string)
        while new_string != string:
            string = new_string
            new_string = _round(string)
        return string, frozenset(redactions)


class WalletCaptureContext(enum.StrEnum):
    COOKIE = "COOKIE"
    OTHER_HEADER = "OTHER_HEADER"
    QUERY = "QUERY"
    POST_BODY = "POST_BODY"


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
        if self == self.ACCOUNT_ADDRESS:
            return "addr"
        return self.value.lower().replace("_", "")


class UserDataPieces:
    @classmethod
    def decode(cls, flow: WalletCaptureFlow, data: Union[dict, str]) -> UserDataPieces:
        if isinstance(data, str):
            pieces = set()
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
                encoded_redacted_str=encoded_redacted_str, redactor=flow.redactor
            ),
        )

    @classmethod
    def classify_str(
        cls, data: str, flow: WalletCaptureFlow, context: WalletCaptureContext
    ) -> UserDataPieces:
        pieces = set()
        for p in UserInfo:
            for extracted in p.extract(data=data, flow=flow, context=context):
                pieces.add(p)
                flow.redactor.add(
                    real_str=extracted,
                    label_prefix=p.label_prefix(),
                    piece=p,
                    hint=p.hint(extracted),
                )
        return cls(
            pieces=frozenset(pieces),
            sample=RedactedString.from_real(real_str=data, redactor=flow.redactor),
        )

    @classmethod
    def classify_dict(
        cls,
        data: Dict[str, str],
        flow: WalletCaptureFlow,
        context: WalletCaptureContext,
    ) -> Dict[str, UserDataPieces]:
        return {
            k: cls.classify_str(data=v, flow=flow, context=context)
            for k, v in data.items()
        }

    @classmethod
    def classify_multidict(
        cls,
        data: Dict[str, Union[str, List[str]]],
        flow: WalletCaptureFlow,
        context: WalletCaptureContext,
    ) -> Dict[str, Tuple[UserDataPieces, ...]]:
        classified = {}
        for k, v in data.items():
            if isinstance(v, list):
                classified[k] = tuple(
                    cls.classify_str(data=s, flow=flow, context=context) for s in v
                )
            else:
                classified[k] = (cls.classify_str(data=v, flow=flow, context=context),)
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


class WalletRequest:
    @classmethod
    def decode(cls, data: dict, flow: WalletCaptureFlow):
        def _decode_if_set(k):
            return UserDataPieces.decode(flow=flow, data=data[k]) if k in data else None

        def _decode_str_multidict(k):
            decoded = {}
            for k, v in data.get(k, {}).items():
                if isinstance(v, list):
                    decoded[k] = tuple(
                        UserDataPieces.decode(flow=flow, data=x) for x in v
                    )
                else:
                    decoded[k] = (UserDataPieces.decode(flow=flow, data=v),)
            return decoded

        json_rpc_method = ()
        if "jsonRpcMethod" in data:
            if isinstance(data["jsonRpcMethod"], list):
                json_rpc_method = tuple(data["jsonRpcMethod"])
            else:
                json_rpc_method = (data["jsonRpcMethod"],)

        return cls(
            flow=flow,
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
            review=data.get("review", None),
        )

    @classmethod
    def from_request(cls, flow: WalletCaptureFlow, req: http.Request):
        session_time = flow.wallet_data.session_time()
        url = urllib.parse.urlparse(req.url)
        json_rpc_method = ()
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
            flow=flow,
            domain=url.hostname,
            path=url.path,
            query=UserDataPieces.classify_multidict(
                req.query, flow=flow, context=WalletCaptureContext.QUERY
            ),
            json_rpc_method=json_rpc_method,
            content=UserDataPieces.classify_str(
                text, flow=flow, context=WalletCaptureContext.POST_BODY
            )
            if text is not None
            else None,
            cookies=UserDataPieces.classify_multidict(
                req.cookies, flow=flow, context=WalletCaptureContext.COOKIE
            ),
            referer_domain=referer_domain,
            odd_headers=UserDataPieces.classify_multidict(
                {
                    k: v
                    for k, v in (req.headers or {}).items()
                    if not is_benign_header(k)
                },
                flow=flow,
                context=WalletCaptureContext.OTHER_HEADER,
            ),
            odd_trailers=UserDataPieces.classify_multidict(
                {
                    k: v
                    for k, v in (req.trailers or {}).items()
                    if not is_benign_header(k)
                },
                flow=flow,
                context=WalletCaptureContext.OTHER_HEADER,
            ),
            session_time=session_time,
            review=None,
        )

    def __init__(
        self,
        flow: WalletCaptureFlow,
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
        self._flow = flow
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
        return f"{self._domain}: {self._path}{_maybe_multidict('query', self._query)}{json_rpc}{content}{_maybe_multidict('cookie', self._cookies)}{referer_domain}{_maybe_multidict('headers', self._odd_headers)}{_maybe_multidict('trailers', self._odd_trailers)}"

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
                    encoded[k] = list(x.encode() for x in v)
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


class WalletDataCollectionAddon:
    def __init__(self):
        self._wallet_id: Optional[str] = None
        self._wallet_type: str = "software"
        self._wallet_variant: Optional[str] = None
        self._current_ux_flow: Optional[UxFlow] = None
        self._wallet_data: Optional[WalletCaptureFile] = None
        self._data_path = os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            ),
            "data",
        )
        self._lock = threading.Lock()
        self._flush_thread = None

    def _wallet_collection_path(self):
        assert self._wallet_id is not None and self._wallet_variant is not None
        return os.path.join(
            self._data_path,
            f"{self._wallet_type.lower()}-wallets",
            "collection",
            self._wallet_id.lower(),
            f"{self._wallet_id.lower()}.{self._wallet_variant.lower()}.capture.json",
        )

    def configure(self, updated):
        if "wallet_type" in updated:
            assert self._wallet_type is None, (
                "Tried to update wallet_type twice; please restart mitmproxy instead."
            )
            self._wallet_type = ctx.options.wallet_type

        if "wallet_variant" in updated:
            assert self._wallet_variant is None, (
                "Tried to update wallet_variant twice; please restart mitmproxy instead."
            )
            self._wallet_variant = ctx.options.wallet_variant

        if "wallet_id" in updated:
            assert self._wallet_id is None, (
                "Tried to update wallet_id twice; please restart mitmproxy instead."
            )
            self._wallet_id = ctx.options.wallet_id
            if not os.path.exists(self._wallet_collection_path()):
                os.makedirs(
                    os.path.dirname(self._wallet_collection_path()), exist_ok=True
                )
                with open(self._wallet_collection_path(), "w") as f:
                    f.write("{}")
            self._wallet_data = WalletCaptureFile(
                path=self._wallet_collection_path(),
            )

        if "ux_flow" in updated:
            assert self._current_ux_flow is None, (
                "Tried to update ux_flow twice; please restart mitmproxy instead."
            )
            assert ctx.options.ux_flow in UxFlow, (
                f"Invalid ux_flow: {repr(ctx.options.ux_flow)}. Must be one of the following: {', '.join(str(f) for f in UxFlow)}."
            )
            self._current_ux_flow = UxFlow[ctx.options.ux_flow]

    def load(self, loader: Loader):
        loader.add_option("wallet_id", str, "", "Wallet ID.")
        loader.add_option(
            "wallet_type",
            str,
            "software",
            "Wallet type (software, hardware, embedded).",
        )
        loader.add_option("wallet_variant", str, "", "Wallet variant.")
        loader.add_option(
            "ux_flow",
            str,
            "",
            f"Wallet UX flow being exercised. Must be one of the following: {', '.join(str(f) for f in UxFlow)}.",
        )

    def running(self):
        assert self._current_ux_flow is not None, (
            "Must set options for this addon: wallet_id, wallet_variant, ux_flow."
        )
        with self._lock:
            if self._flush_thread is None:
                self._flush_thread = threading.Thread(target=self._background)
                self._flush_thread.start()

    def _background(self):
        loop = True
        while loop:
            time.sleep(0.2)
            if self._wallet_data is not None:
                self._wallet_data.flush()
            with self._lock:
                loop = self._flush_thread is not None

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
            "Received a request before being fully configured!"
        )
        req = flow.request
        host = req.host
        req.anticache()
        req.constrain_encoding()
        data_flow = self._wallet_data.flow(self._current_ux_flow)
        wallet_data_req = WalletRequest.from_request(flow=data_flow, req=req)
        data_flow.add(wallet_data_req)
        logging.info("[%s] %s", host, wallet_data_req)


addons = [WalletDataCollectionAddon()]
