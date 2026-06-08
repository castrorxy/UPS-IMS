import sqlite3, os
DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'inventory.db')
if not os.path.exists(DB):
    print('DB not found:', DB)
    raise SystemExit(1)
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
rows = cur.execute("SELECT id,stock_no,serial_number,client,category,status FROM inventory WHERE CAST(stock_no AS INTEGER) BETWEEN 187 AND 238 ORDER BY CAST(stock_no AS INTEGER)").fetchall()
for r in rows:
    print(r['stock_no'] or '', '|', r['client'] or '<<empty>>', '|', r['category'] or '<<none>>', '|', r['status'] or '<<none>>')
print('rows:', len(rows))
conn.close()
