"""Acknowledged, revision-checked storage for the App Center actor."""
import base64
import json
import os
from pathlib import Path
import sys

from pymongo import MongoClient, WriteConcern


def operate(database, action, data):
    if action == "load":
        return list(database.apps.find())
    if action == "get":
        return database.apps.find_one({"_id": data["_id"]}) or {}
    if action != "save":
        raise ValueError("Unknown catalog operation")
    previous = data["revision"] - 1
    if previous == 0:
        database.apps.insert_one(data)
    elif not database.apps.replace_one({"_id": data["_id"], "revision": previous}, data).matched_count:
        raise ValueError("Catalog revision changed")
    return {}


if __name__ == "__main__":
    with MongoClient("127.0.0.1", int(os.environ["APP_MONGO_PORT"]),
                     username="app_center", password=Path("/auth/app-center").read_text().strip(),
                     authSource="app_center", timeoutMS=2500, serverSelectionTimeoutMS=1800) as client:
        db = client.get_database("app_center", write_concern=WriteConcern(w=1, j=True))
        print(json.dumps(operate(db, sys.argv[1], json.loads(base64.b64decode(sys.argv[2])))))
