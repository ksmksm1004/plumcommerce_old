import os
from datetime import date, timedelta
import mysql.connector
from dotenv import load_dotenv

load_dotenv()
conn = mysql.connector.connect(
    host=os.getenv('DB_HOST'), port=int(os.getenv('DB_PORT', '3306')),
    user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'), database=os.getenv('DB_NAME')
)
cur = conn.cursor()
agg_day = date.today() - timedelta(days=1)
cur.execute('''
INSERT INTO daily_view_stats (stat_date, product_id, view_count)
SELECT %s, product_id, COUNT(*) FROM view_history
WHERE DATE(viewed_at)=%s GROUP BY product_id
ON DUPLICATE KEY UPDATE view_count=VALUES(view_count)
''', (agg_day, agg_day))
conn.commit()
print(f'Aggregated view history for {agg_day}')
