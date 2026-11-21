"""Isolated catalog storage for the native process fixtures. Docker E2E uses MongoDB."""
import base64
import json
import os
from pathlib import Path
import sys

path = Path(os.environ["FIXTURE_DIR"]) / "catalog.json"
records = json.loads(path.read_text()) if path.exists() else {}
action, encoded = sys.argv[1:]
data = json.loads(base64.b64decode(encoded))
response = {}
if action == "load":
    response = list(records.values())
elif action == "get":
    response = records.get(data["_id"], {})
elif action == "save":
    assert data["revision"] == records.get(data["_id"], {}).get("revision", 0) + 1
    records[data["_id"]] = data
    path.write_text(json.dumps(records))
else:
    raise ValueError(action)
print(json.dumps(response))
