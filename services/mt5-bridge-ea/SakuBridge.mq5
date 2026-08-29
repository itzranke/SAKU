//+------------------------------------------------------------------+
//|                                                   SakuBridge.mq5 |
//|                                  Copyright 2026, SAKU Core Team  |
//|                                             https://saku.app     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, SAKU Core Team"
#property link      "https://saku.app"
#property version   "1.00"
#property description "SAKU MetaTrader 5 Read-Only Local Sync Bridge EA"

input string InpSakuApiUrl    = "http://localhost:4000/api/v1/trading/sync"; // SAKU API Endpoint
input string InpAccountToken  = "saku_account_secret_token";                // Account Bridge Secret
input int    InpSyncInterval  = 5;                                           // Sync Interval (Seconds)

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   EventSetTimer(InpSyncInterval);
   Print("SAKU MT5 Bridge EA initialized successfully. Sync interval: ", InpSyncInterval, " seconds.");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("SAKU MT5 Bridge EA stopped.");
  }

//+------------------------------------------------------------------+
//| Timer event function                                             |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SyncAccountState();
  }

//+------------------------------------------------------------------+
//| Collect and send account state payload to SAKU API               |
//+------------------------------------------------------------------+
void SyncAccountState()
  {
   double balance      = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin       = AccountInfoDouble(ACCOUNT_MARGIN);
   double free_margin  = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   long   login        = AccountInfoInteger(ACCOUNT_LOGIN);
   string company      = AccountInfoString(ACCOUNT_COMPANY);
   string currency     = AccountInfoString(ACCOUNT_CURRENCY);

   string jsonPayload = StringFormat(
      "{\"account_id\":\"%d\",\"broker\":\"%s\",\"currency\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"free_margin\":%.2f,\"timestamp\":%d}",
      login, company, currency, balance, equity, margin, free_margin, TimeCurrent()
   );

   char data[];
   char result[];
   string result_headers;
   
   StringToCharArray(jsonPayload, data, 0, StringLen(jsonPayload));
   
   string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + InpAccountToken + "\r\n";
   int res = WebRequest("POST", InpSakuApiUrl, headers, 3000, data, result, result_headers);

   if(res == 200 || res == 201)
     {
      Print("SAKU Sync Success: Balance=", balance, " Equity=", equity);
     }
   else
     {
      Print("SAKU Sync Warning: WebRequest returned code ", res);
     }
  }
