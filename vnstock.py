"""
Vercel Python Serverless Function - VNStock API
Endpoint duy nhat: /api/vnstock?action=...&symbol=...
"""

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import sys
import io


# ── Dang ky API key truoc khi import vnstock ──────────────────────────────────
_api_key = os.environ.get("VNSTOCK_API_KEY", "").strip()
_key_registered = False

def _register_key():
    global _key_registered
    if _key_registered or not _api_key:
        return
    try:
        old = sys.stdout
        sys.stdout = io.StringIO()
        from vnstock import register_user
        register_user(api_key=_api_key)
        sys.stdout = old
        _key_registered = True
    except Exception:
        sys.stdout = old


def _df_to_records(df):
    """Chuyen DataFrame thanh list of dicts."""
    import pandas as pd
    if df is None:
        return []
    if isinstance(df, pd.DataFrame):
        if df.empty:
            return []
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ["_".join(str(c) for c in col).strip("_") for col in df.columns]
        df = df.where(pd.notnull(df), None)
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].astype(str)
        return df.to_dict(orient="records")
    if isinstance(df, dict):
        return [df]
    if isinstance(df, (list, tuple)):
        result = []
        for item in df:
            result.extend(_df_to_records(item))
        return result
    return [{"result": str(df)}]


def _get_stock(symbol, source="VCI"):
    _register_key()
    from vnstock import Vnstock
    vs = Vnstock(source=source, show_log=False)
    return vs.stock(symbol=symbol, source=source)


def _default_dates(start, end):
    from datetime import datetime, timedelta
    if not end:
        end = datetime.now().strftime("%Y-%m-%d")
    if not start:
        start = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    return start, end


# ── Dispatch cac action ───────────────────────────────────────────────────────

def dispatch(action, params):
    sym = params.get("symbol", [""])[0].upper()
    source = params.get("source", ["VCI"])[0]
    period = params.get("period", ["quarter"])[0]
    interval = params.get("interval", ["1D"])[0]
    start = params.get("start", [None])[0]
    end = params.get("end", [None])[0]
    page_size = int(params.get("page_size", ["100"])[0])
    symbols = params.get("symbols", [""])[0]

    # Health
    if action == "health":
        return {"status": "ok", "api_key_set": bool(_api_key)}

    # Stock: Gia
    if action == "history":
        s, e = _default_dates(start, end)
        stock = _get_stock(sym, source)
        return _df_to_records(stock.quote.history(start=s, end=e, interval=interval))

    if action == "intraday":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.quote.intraday(page_size=page_size))

    if action == "depth":
        stock = _get_stock(sym, source)
        try:
            return _df_to_records(stock.quote.price_depth())
        except Exception as e:
            return [{"error": str(e)}]

    # Stock: Doanh nghiep
    if action == "overview":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.company.overview())

    if action == "shareholders":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.company.shareholders())

    if action == "officers":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.company.officers())

    if action == "news":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.company.news())

    if action == "events":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.company.events())

    # Stock: Tai chinh
    if action == "balance-sheet":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.finance.balance_sheet(period=period))

    if action == "income":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.finance.income_statement(period=period))

    if action == "cashflow":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.finance.cash_flow(period=period))

    if action == "ratio":
        stock = _get_stock(sym, source)
        return _df_to_records(stock.finance.ratio(period=period))

    # Listing
    if action == "all-symbols":
        _register_key()
        from vnstock.api.listing import Listing
        lst = Listing(source=source.lower())
        return _df_to_records(lst.all_symbols())

    if action == "group-symbols":
        group = params.get("group", ["VN30"])[0].upper()
        _register_key()
        from vnstock.api.listing import Listing
        lst = Listing(source=source.lower())
        return _df_to_records(lst.symbols_by_group(group=group))

    if action == "industries":
        _register_key()
        from vnstock.api.listing import Listing
        lst = Listing(source=source.lower())
        return _df_to_records(lst.industries_icb())

    # Bang gia
    if action == "board":
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        if not symbol_list:
            raise ValueError("Can it nhat 1 ma co phieu")
        _register_key()
        from vnstock.api.trading import Trading
        t = Trading(source=source.lower())
        return _df_to_records(t.price_board(symbols_list=symbol_list))

    # Thi truong quoc te
    if action in ("fx", "crypto", "world-index"):
        s, e = _default_dates(start, end)
        _register_key()
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            from vnstock import Vnstock
            vs = Vnstock(source="MSN", show_log=False)
            sys.stdout = old
            if action == "fx":
                obj = vs.fx(symbol=sym)
            elif action == "crypto":
                obj = vs.crypto(symbol=sym)
            else:
                obj = vs.world_index(symbol=sym)
            return _df_to_records(obj.quote.history(start=s, end=e, interval=interval))
        except Exception as ex:
            sys.stdout = old
            return [{"error": str(ex)}]

    # Quy mo
    if action == "funds":
        _register_key()
        from vnstock import Vnstock
        vs = Vnstock(show_log=False)
        f = vs.fund()
        return _df_to_records(f.listing())

    raise ValueError("Action khong hop le: " + action)


# ── Vercel Handler ────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        action = params.get("action", ["health"])[0]

        try:
            data = dispatch(action, params)
            self._send_json(200, {"success": True, "data": data})
        except Exception as e:
            self._send_json(400, {"success": False, "error": str(e)})

    def do_OPTIONS(self):
        self._send_json(200, {})

    def _send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # Tat access log
