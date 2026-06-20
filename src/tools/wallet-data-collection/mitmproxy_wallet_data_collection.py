from __future__ import annotations

import enum
import json
import hashlib
import logging
import os
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
            existing =  self._strings.get(item.str, None)
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

    def mark_flushed(self, amount: int) -> None:
        with self._lock:
            self._needs_flushing -= amount

    def encode(self) -> list[dict]:
        with self._lock:
            return [item.encode() for item in sorted(self._strings.values(), key=lambda x: hashlib.sha256(x.str.encode('utf-8')).hexdigest())]


class WalletCaptureContext(enum.StrEnum):
    COOKIE = "COOKIE"
    OTHER_HEADER = "OTHER_HEADER"
    QUERY = "QUERY"
    POST_BODY = "POST_BODY"


class UserDataPieces:
    @classmethod
    def decode(cls, data: Union[dict, str]) -> UserDataPieces:
        if isinstance(data, str):
            # Legacy format: just a string sample with no pieces
            return cls(
                pieces=frozenset(),
                sample=UserDataString(str=data, pieces=set()),
            )
        else:
            pieces_list = []
            if "pieces" in data:
                pieces_list = data["pieces"]
            elif "piece" in data:
                pieces_list = [data["piece"]]

            pieces = set(UserInfo[p] for p in pieces_list)
            sample_str = data["sample"]
            # Sample can be a plain string or a dict with "str" field
            if isinstance(sample_str, dict):
                sample = UserDataString.decode(sample_str)
                # Merge pieces from sample with pieces from outer dict
                all_pieces = set(pieces)
                for p in sample.pieces:
                    all_pieces.add(p)
                pieces = all_pieces
            else:
                sample = UserDataString(str=sample_str, pieces=set())

        return cls(pieces=frozenset(pieces), sample=sample)

    @classmethod
    def classify_str(cls, data: str, context: WalletCaptureContext) -> UserDataPieces:
        return cls(
            pieces=frozenset(),
            sample=UserDataString(str=data, pieces=set()),
        )

    @classmethod
    def classify_multidict(
        cls,
        data: Dict[str, Union[str, List[str]]],
        context: WalletCaptureContext,
    ) -> Dict[str, Tuple[UserDataPieces, ...]]:
        classified = {}
        for k, v in data.items():
            if isinstance(v, list):
                classified[k] = tuple(
                    cls.classify_str(data=s, context=context)
                    for s in v
                )
            else:
                classified[k] = (
                    cls.classify_str(data=v, context=context),
                )
        return classified

    def __init__(self, pieces: FrozenSet[UserInfo], sample: UserDataString):
        self._pieces = pieces
        self._sample = sample

    def __str__(self):
        return repr(self._sample)

    def __repr__(self):
        return str(self)

    def encode(self):
        if len(self._pieces) == 0:
            return self._sample.str

        data = {
            "sample": self._sample.str,
        }

        sorted_pieces = list(sorted(str(p) for p in self._pieces))
        if len(sorted_pieces) == 1:
            data["piece"] = sorted_pieces[0]
        elif len(sorted_pieces) > 1:
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
    def decode(cls, data: dict):
        def _decode_if_set(k):
            if k not in data:
                return None
            return UserDataPieces.decode(data=data[k])

        def _decode_str_multidict(k):
            decoded = {}
            for key, v in data.get(k, {}).items():
                if isinstance(v, list):
                    decoded[key] = tuple(
                        UserDataPieces.decode(data=x) for x in v
                    )
                else:
                    decoded[key] = (UserDataPieces.decode(data=v),)
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
            content=_decode_if_set("content"),
            cookies=_decode_str_multidict("cookies"),
            referer_domain=data.get("refererDomain"),
            odd_headers=_decode_str_multidict("oddHeaders"),
            odd_trailers=_decode_str_multidict("oddTrailers"),
            session_time=data["sessionTime"],
            review=data.get("review"),
        )

    @classmethod
    def from_request(cls, req: http.Request, session_time: int):
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
            domain=url.hostname,
            path=url.path,
            query=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(req.query),
                context=WalletCaptureContext.QUERY,
            ),
            json_rpc_method=json_rpc_method,
            content=(
                UserDataPieces.classify_str(
                    text, context=WalletCaptureContext.POST_BODY
                )
                if text is not None
                else None
            ),
            cookies=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(req.cookies),
                context=WalletCaptureContext.COOKIE,
            ),
            referer_domain=referer_domain,
            odd_headers=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(
                    req.headers, filter_fn=lambda k: not is_benign_header(k)
                ),
                context=WalletCaptureContext.OTHER_HEADER,
            ),
            odd_trailers=UserDataPieces.classify_multidict(
                _multidict_to_dict_of_lists(
                    req.trailers, filter_fn=lambda k: not is_benign_header(k)
                )
                if req.trailers
                else {},
                context=WalletCaptureContext.OTHER_HEADER,
            ),
            session_time=session_time,
            review=None,
        )

    def __init__(
        self,
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
                        "userData": self._user_data_store.encode(),
                        "sessions": self._session_number,
                    },
                    f,
                    indent="\t",
                    ensure_ascii=False,
                )
                f.write("\n")

            os.rename(self.path + ".tmp", self.path)

            # Mark as flushed
            self._needs_flushing -= file_flush_amount
            self._user_data_store.mark_flushed(user_data_flush_amount)
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
            req=req,
            session_time=self._wallet_data.session_time(),
        )
        self._wallet_data.flow(self._current_ux_flow).add(wallet_data_req)
        logging.info("[%s] %s", host, wallet_data_req)


addons = [WalletDataCollectionAddon()]
