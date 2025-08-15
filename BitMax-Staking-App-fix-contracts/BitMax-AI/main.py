from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import re
import numpy as np
import asyncio
from lstm_model import train_lstm, predict_yield
from rl_agent import train_rl_agent, optimize_split
from data_fetcher import fetch_live_data, get_coin_history, get_coin_data

lstm_model = None
scaler = None
rl_model = None

def run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)

def initialize_models():
    global lstm_model, scaler, rl_model
    lstm_model, scaler = run_async(train_lstm("bitcoin", get_coin_history))
    market_data = run_async(fetch_live_data())
    rl_model = train_rl_agent(market_data)
    print("Models initialized successfully")

def cleanup_models():
    global lstm_model, scaler, rl_model
    lstm_model = None
    scaler = None
    rl_model = None
    print("Models cleaned up")

class CryptoHandler(BaseHTTPRequestHandler):
    COIN_DATA_PATTERN = re.compile(r'^/coins/([^/]+)$')
    COIN_HISTORY_PATTERN = re.compile(r'^/coins/([^/]+)/history(?:\?days=(\d+))?$')
    OPTIMIZE_PATTERN = re.compile(r'^/optimize$')

    def _set_headers(self, status_code=200, content_type='application/json'):
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.end_headers()

    def _send_json_response(self, data, status_code=200):
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _send_error(self, message, status_code=400):
        self._send_json_response({'error': message}, status_code)

    def _parse_query_params(self):
        if '?' not in self.path:
            return {}
        query_string = self.path.split('?', 1)[1]
        params = {}
        for param in query_string.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                params[key] = value
            else:
                params[param] = True
        return params

    def _read_request_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length)
            return json.loads(body)
        return {}

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        coin_data_match = self.COIN_DATA_PATTERN.match(self.path)
        if coin_data_match:
            coin_id = coin_data_match.group(1)
            try:
                data = run_async(get_coin_data(coin_id))
                self._send_json_response(data)
            except Exception as e:
                self._send_error(f"Failed to fetch data for {coin_id}: {str(e)}")
            return

        coin_history_match = self.COIN_HISTORY_PATTERN.match(self.path)
        if coin_history_match:
            coin_id = coin_history_match.group(1)
            days = int(coin_history_match.group(2) or 30)
            try:
                data = run_async(get_coin_history(coin_id, days))
                self._send_json_response(data)
            except Exception as e:
                self._send_error(f"Failed to fetch history for {coin_id}: {str(e)}")
            return

        if self.path == '/coins/core':
            try:
                data = run_async(get_coin_data("core"))
                self._send_json_response(data)
            except Exception as e:
                self._send_error(f"Failed to fetch data for core: {str(e)}")
            return

        if self.path == '/coins/bitcoin':
            try:
                data = run_async(get_coin_data("bitcoin"))
                self._send_json_response(data)
            except Exception as e:
                self._send_error(f"Failed to fetch data for bitcoin: {str(e)}")
            return

        if self.path == '/coins/core/history' or self.path.startswith('/coins/core/history?'):
            params = self._parse_query_params()
            days = int(params.get('days', 30))
            try:
                data = run_async(get_coin_history("core", days))
                self._send_json_response(data)
            except Exception as e:
                self._send_error(f"Failed to fetch history for core: {str(e)}")
            return

        if self.path == '/coins/bitcoin/history' or self.path.startswith('/coins/bitcoin/history?'):
            params = self._parse_query_params()
            days = int(params.get('days', 30))
            try:
                data = run_async(get_coin_history("bitcoin", days))
                self._send_json_response(data)
            except Exception as e:
                self._send_error(f"Failed to fetch history for bitcoin: {str(e)}")
            return

        self._send_error("Not found", 404)

    def do_POST(self):
        if self.path == '/optimize':
            try:
                global lstm_model, scaler, rl_model
                if not lstm_model or not scaler or not rl_model:
                    self._send_error("Models not initialized", 500)
                    return

                user_data = self._read_request_body()
                market_data = run_async(fetch_live_data())
                last_60_days = np.array([x[1] for x in run_async(get_coin_history("bitcoin", days=60))['prices']])
                predicted_yield = predict_yield(lstm_model, scaler, last_60_days)
                pt_split, yt_split = optimize_split(rl_model, market_data)
                self._send_json_response({
                    "recommended_split": {
                        "PT": pt_split,
                        "YT": yt_split
                    },
                    "predicted_yield": predicted_yield
                })
            except Exception as e:
                self._send_error(f"Optimization failed: {str(e)}", 500)
            return

        self._send_error("Not found", 404)

def run_server(host='localhost', port=8000):
    try:
        initialize_models()
        server = HTTPServer((host, port), CryptoHandler)
        print(f"Server running at http://{host}:{port}")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
            cleanup_models()
            print("Server stopped")
    except Exception as e:
        print(f"Failed to start server: {str(e)}")

if __name__ == "__main__":
    run_server()
