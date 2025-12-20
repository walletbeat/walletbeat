import json
import logging
from mitmproxy import http

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ALLOWED_DOMAINS = {
		"eth.llamarpc.com"
}

ALLOWED_METHODS = {
	"eth_accounts",
	"eth_blobBaseFee",
	"eth_blockNumber",
	"eth_call",
	"eth_chainId",
	"eth_coinbase",
	"eth_estimateGas",
	"eth_feeHistory",
	"eth_gasPrice",
	"eth_getBalance",
	"eth_getBlockByHash",
	"eth_getBlockByNumber",
	"eth_getBlockTransactionCountByHash",
	"eth_getBlockTransactionCountByNumber",
	"eth_getCode",
	"eth_getLogs",
	"eth_getProof",
	"eth_getStorageAt",
	"eth_getTransactionByBlockHashAndIndex",
	"eth_getTransactionByBlockNumberAndIndex",
	"eth_getTransactionByHash",
	"eth_getTransactionCount",
	"eth_getTransactionReceipt",
	"eth_getUncleByBlockHashAndIndex",
	"eth_getUncleByBlockNumberAndIndex",
	"eth_getUncleCountByBlockHash",
	"eth_getUncleCountByBlockNumber",
	"eth_getWork",
	"eth_hashrate",
	"eth_maxPriorityFeePerGas",
	"eth_mining",
	"eth_protocolVersion",
	"eth_sendRawTransaction",
	"eth_sendTransaction",
	"eth_sign",
	"eth_signTransaction",
	"eth_syncing",
	"net_listening",
	"net_peerCount",
	"net_version",
	"web3_clientVersion",
	"web3_sha3",
}

# ---------------------------------------------------------------------------
# Addon implementation
# ---------------------------------------------------------------------------

class JsonRpcFilter:
		"""
		- Only allows traffic to ALLOWED_DOMAINS.
		- For allowed domains, only accepts JSON-RPC 2.0 requests.
		- Supports both Single and Batch JSON-RPC requests.
		- Only allows JSON-RPC methods in ALLOWED_METHODS.
			If a batch request contains ONE disallowed method, the whole batch is rejected.
		"""

		def __init__(self):
				self.allowed_domains = set(ALLOWED_DOMAINS)
				self.allowed_methods = set(ALLOWED_METHODS)

		# Helpers ---------------------------------------------------------------

		@staticmethod
		def _make_unauthorized_response(message: str) -> http.Response:
				"""Helper for HTTP 401 responses (protocol errors)."""
				return http.Response.make(
						401,
						json.dumps({"error": message}).encode("utf-8"),
						{"Content-Type": "application/json"},
				)

		@staticmethod
		def _make_jsonrpc_error_obj(id_value, message: str, code: int) -> dict:
				"""
				Builds a JSON-RPC 2.0 error dict.
				"""
				return {
						"jsonrpc": "2.0",
						"id": id_value,
						"error": {
								"code": code,
								"message": message,
						},
				}

		@staticmethod
		def _is_valid_jsonrpc_item(obj) -> bool:
				"""Checks if a single object matches the minimal JSON-RPC 2.0 spec."""
				return (
						isinstance(obj, dict)
						and obj.get("jsonrpc") == "2.0"
						and isinstance(obj.get("method"), str)
				)

		# mitmproxy hook --------------------------------------------------------

		def request(self, flow: http.HTTPFlow) -> None:
				req = flow.request

				host = req.host

				# 1. Domain allowlist
				if host not in self.allowed_domains:
						logging.info('[%s]: Domain not allowed', host)
						flow.response = self._make_unauthorized_response("Domain not allowed")
						return

				# 2. Must be JSON with JSON-RPC 2.0
				if req.method.upper() != "POST":
						logging.info('[%s]: Method %s not allowed', host, req.method.upper())
						flow.response = self._make_unauthorized_response("JSON-RPC must use POST")
						return

				content_type = req.headers.get("Content-Type", "")
				if "application/json" not in content_type:
						logging.info('[%s]: Invalid Content-Type header', host)
						flow.response = self._make_unauthorized_response("Content-Type must be application/json")
						return

				body_text = req.get_text()
				if not body_text:
						logging.info('[%s]: Empty request body', host)
						flow.response = self._make_unauthorized_response("Empty request body")
						return

				try:
						payload = json.loads(body_text)
				except json.JSONDecodeError:
						logging.info('[%s]: Invalid JSON', host)
						flow.response = self._make_unauthorized_response("Invalid JSON")
						return

				# Normalize to list for processing, but remember if it was a batch
				is_batch = isinstance(payload, list)
				requests = payload if is_batch else [payload]

				# 3. Validate Structure
				if is_batch and not requests:
						logging.info('[%s]: Empty batch request', host)
						# JSON-RPC 2.0 spec says empty array is an "Invalid Request"
						error_obj = self._make_jsonrpc_error_obj(None, "Invalid Request: Empty Batch", -32600)
						flow.response = http.Response.make(
								200,
								json.dumps(error_obj).encode("utf-8"),
								{"Content-Type": "application/json"}
						)
						return

				if not all(self._is_valid_jsonrpc_item(r) for r in requests):
						logging.info('[%s]: Payload contains invalid JSON-RPC objects', host)
						flow.response = self._make_unauthorized_response("Not a valid JSON-RPC 2.0 request")
						return

				# 4. Check Methods
				# We look for ANY disallowed method in the list.
				disallowed_methods = []
				for r in requests:
						if r["method"] not in self.allowed_methods:
								disallowed_methods.append(r["method"])
								break

				if len(disallowed_methods) > 0:
						logging.info('[%s]: Blocked request (batch=%s) due to disallowed method(s): %s', host, is_batch, repr(disallowed_methods))
						
						# Construct error responses
						response_payload = []
						
						for r in requests:
								r_id = r.get("id")
								r_method = r.get("method")

								if r_method in self.allowed_methods:
										# Method was allowed, but batch failed due to neighbors.
										# Returning "Unavailable" (generic server error or specific code)
										# -32000 to -32099 are implementation-defined server-errors.
										err = self._make_jsonrpc_error_obj(
												r_id, 
												"Service unavailable: Batch rejected due to other disallowed methods", 
												-32000
										)
								else:
										# Method specifically not allowed
										# -32601 is "Method not found" (standard for disallowed/unknown)
										err = self._make_jsonrpc_error_obj(
												r_id, 
												"Method not allowed", 
												-32601
										)
								
								response_payload.append(err)

						# If original request was single (not batch), unwrap the list
						final_body = response_payload if is_batch else response_payload[0]

						flow.response = http.Response.make(
								200,
								json.dumps(final_body).encode("utf-8"),
								{"Content-Type": "application/json"},
						)
						return

				# If we reach here, ALL methods in the batch (or single) are allowed.
				# Log summary
				method_names = [r["method"] for r in requests]
				if len(method_names) > 5:
						# Summarize large batches
						logging.info('[%s]: Proxying batch of %d methods', host, len(method_names))
				else:
						logging.info('[%s]: Proxying method(s): %s', host, ", ".join(method_names))


addons = [
		JsonRpcFilter()
]
