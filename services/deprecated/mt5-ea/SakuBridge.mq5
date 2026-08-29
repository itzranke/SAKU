//+------------------------------------------------------------------+
//|                                                   SakuBridge.mq5 |
//|                                  Copyright 2026, SAKU Core Team  |
//|                                             https://saku.app     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, SAKU Core Team"
#property link      "https://saku.app"
#property version   "1.10"
#property description "SAKU MetaTrader 5 Read-Only Sync Bridge EA (v1.1: account state + closed-deal P&L journals)."
#property description "DEPRECATED since v1.2 (ADR-022): default path is the server-side MT5 cloud connector"
#property description "(investor password, read-only) in Settings > Integrations. Kept as an optional zero-password"
#property description "privacy path; journals from this bridge are recorded with source EA_LEGACY."
#property description "SAFETY: this EA never places/modifies/closes orders. It only READS account & history data"
#property description "and POSTs it to the SAKU Core API. Requires URL whitelist entry: Tools > Options > Expert"
#property description "Advisors > Allow WebRequest for listed URL: http://localhost:4000 (or your API host)."

input string InpSakuApiBase   = "http://localhost:4000/api/v1"; // SAKU Core API base (…/api/v1)
input string InpAccountToken  = "saku_account_secret_token";    // Account Bridge Secret
input int    InpSyncInterval  = 5;                              // Sync Interval (Seconds)
input bool   InpSendClosedDeals = true;                          // Also send closed deals (realized P&L)
input int    InpDealWindowSec = 120;                             // History lookback window for deals (seconds)
input int    InpStatePingEvery = 12;                             // GET /trading/state every N ticks (0=off)

int g_ticks = 0;

//+------------------------------------------------------------------+
//| String escaper for JSON payloads                                 |
//+------------------------------------------------------------------+
string JsonEscape(const string s)
  {
   string out = "";
   int len = StringLen(s);
   for(int i = 0; i < len; i++)
     {
      ushort c = StringGetCharacter(s, i);
      if(c == '"')       out += "\\\"";
      else if(c == '\\') out += "\\\\";
      else if(c == '\n') out += "\\n";
      else if(c == '\r') out += "\\r";
      else if(c == '\t') out += "\\t";
      else               out += ShortToString(c);
     }
   return out;
  }

//+------------------------------------------------------------------+
//| Extract a numeric field like "journals_posted":7 from a response  |
//+------------------------------------------------------------------+
long JsonNumberField(const string body, const string key)
  {
   int p = StringFind(body, key);
   if(p < 0) return -1;
   p += StringLen(key) + 1; // skip "key":
   int start = p;
   while(p < StringLen(body))
     {
      ushort c = StringGetCharacter(body, p);
      if((c >= '0' && c <= '9') || c == '-') { p++; continue; }
      break;
     }
   if(p == start) return -1;
   return StringToInteger(StringSubstr(body, start, p - start));
  }

//+------------------------------------------------------------------+
//| Build "closed_deals":[...] from trade history (net realized P&L) |
//+------------------------------------------------------------------+
string BuildClosedDealsJson()
  {
   if(!InpSendClosedDeals) return "";
   datetime from = TimeCurrent() - InpDealWindowSec;
   if(!HistorySelect(from, TimeCurrent())) return "";

   string items = "";
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      double profit   = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double swap     = HistoryDealGetDouble(ticket, DEAL_SWAP);
      double comm     = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double netPnl   = profit + swap + comm; // accounting truth: fees & swap are part of realized P&L
      if(netPnl == 0.0) continue;            // zero-P&L legs produce no journal anyway

      string symbol   = HistoryDealGetString(ticket, DEAL_SYMBOL);
      long   dtype    = HistoryDealGetInteger(ticket, DEAL_TYPE);      // 0=BUY 1=SELL
      double lots     = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price    = HistoryDealGetDouble(ticket, DEAL_PRICE);
      datetime tclose = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);

      string deal = StringFormat(
        "{\"ticket\":%lld,\"symbol\":\"%s\",\"type\":\"%s\",\"lots\":%.2f,\"close_price\":%.5f,\"profit\":%.2f,\"closed_at\":%lld}",
        (long)ticket,
        JsonEscape(symbol),
        dtype == DEAL_TYPE_BUY ? "BUY" : "SELL",
        lots, price, netPnl, (long)tclose
      );
      items += (items == "" ? "" : ",") + deal;
     }
   if(items == "") return "";
   return ",\"closed_deals\":[" + items + "]";
  }

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
  {
   EventSetTimer(InpSyncInterval);
   PrintFormat("SAKU MT5 Bridge v1.1.0 initialized -> %s (state every %d s, closed_deals=%s, window=%d s)",
               InpSakuApiBase, InpSyncInterval, InpSendClosedDeals ? "on" : "off", InpDealWindowSec);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("SAKU MT5 Bridge EA stopped.");
  }

//+------------------------------------------------------------------+
//| Timer event function                                               |
//+------------------------------------------------------------------+
void OnTimer()
  {
   g_ticks++;
   SyncAccountState();
   if(InpStatePingEvery > 0 && g_ticks % InpStatePingEvery == 0) PingTradingState();
  }

//+------------------------------------------------------------------+
//| Collect and send account state (+ optional closed deals)          |
//+------------------------------------------------------------------+
void SyncAccountState()
  {
   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin      = AccountInfoDouble(ACCOUNT_MARGIN);
   double free_margin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   long   login       = AccountInfoInteger(ACCOUNT_LOGIN);
   string company     = AccountInfoString(ACCOUNT_COMPANY);
   string currency    = AccountInfoString(ACCOUNT_CURRENCY);

   string jsonPayload = StringFormat(
     "{\"account_id\":\"%d\",\"broker\":\"%s\",\"currency\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"free_margin\":%.2f,\"timestamp\":%d%s",
     login, JsonEscape(company), JsonEscape(currency), balance, equity, margin, free_margin, TimeCurrent(),
     BuildClosedDealsJson()
   );
   jsonPayload += "}";

   char data[], result[];
   string result_headers;
   StringToCharArray(jsonPayload, data, 0, StringLen(jsonPayload));

   string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + InpAccountToken + "\r\nX-Saku-Client: saku-bridge\r\n";
   int res = WebRequest("POST", InpSakuApiBase + "/trading/sync", headers, 5000, data, result, result_headers);

   string body = "";
   if(ArraySize(result) > 0) body = CharArrayToString(result);

   if(res == 200 || res == 201)
     {
      long journalsPosted = JsonNumberField(body, "\"journals_posted\"");
      long dupes          = JsonNumberField(body, "\"duplicates_ignored\"");
      PrintFormat("SAKU Sync OK: balance=%.2f equity=%.2f | journals_posted=%I64d duplicates_ignored=%I64d",
                  balance, equity, journalsPosted, dupes);
     }
   else
     {
      PrintFormat("SAKU Sync WARNING: HTTP %d (check URL whitelist/endpoint). Body: %s", res, StringSubstr(body, 0, 200));
     }
  }

//+------------------------------------------------------------------+
//| Read-only sanity ping: confirm the SAKU side received our state   |
//+------------------------------------------------------------------+
void PingTradingState()
  {
   char result[];
   string headers = "Authorization: Bearer " + InpAccountToken + "\r\nX-Saku-Client: saku-bridge\r\n";
   string result_headers;
   int res = WebRequest("GET", InpSakuApiBase + "/trading/state", headers, 5000, result, result_headers);
   if(res == 200)
      PrintFormat("SAKU State Confirmed: processed_tickets=%I64d",
                  JsonNumberField(CharArrayToString(result), "\"processed_tickets\""));
   else
      PrintFormat("SAKU State Ping failed (HTTP %d)", res);
  }
//+------------------------------------------------------------------+
