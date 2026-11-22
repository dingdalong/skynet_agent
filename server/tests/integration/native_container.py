"""Run the app as a child process for the native Skynet integration suite."""
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys
import time

action, app, image = sys.argv[1:]
assert app == "agent"
root = Path(os.environ["FIXTURE_DIR"])
state = root / "native-container.json"
record = json.loads(state.read_text()) if state.exists() else {}


def running():
    if "pid" not in record:
        return False
    try:
        os.kill(record["pid"], 0)
        return True
    except ProcessLookupError:
        return False


if action == "start":
    database = json.load(sys.stdin)
if action == "start" and not running():
    key = secrets.token_hex(32)
    with (root / "app.log").open("ab") as output:
        child = subprocess.Popen(["3rd/skynet/skynet", "etc/config.app"], stdin=subprocess.DEVNULL,
                                 stdout=output, stderr=output, start_new_session=True,
                                 env=dict({k: v for k, v in os.environ.items()
                                           if not k.startswith(("APP_CENTER_MONGO_", "GATEWAY_MONGO_"))},
                                          APP_ID=app, APP_REGISTRATION_KEY=key, APP_DATABASE_CONFIG=json.dumps(database),
                                          APP_SCHEMA="agent/schema.proto"))
    record = {"key": key, "pid": child.pid}
    state.write_text(json.dumps(record))
if action in ("stop", "wait"):
    if action == "stop" and running():
        os.kill(record["pid"], signal.SIGTERM)
    deadline = time.monotonic() + 20
    while running():
        assert time.monotonic() < deadline
        time.sleep(0.1)
if action != "start":
    print(json.dumps(dict(record, running=running(), exit_code=0, image_id="fixture")))
