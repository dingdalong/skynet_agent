"""App Center's local Docker Engine client. One operation per invocation."""
import http.client
import json
import os
import re
import secrets
import socket
import sys
from urllib.parse import quote


class Engine(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(20)
        self.sock.connect("/var/run/docker.sock")


def request(method, path, data=None, missing=False):
    engine = Engine("localhost")
    try:
        engine.request(method, path, json.dumps(data) if data is not None else None,
                       {"Content-Type": "application/json"})
        reply = engine.getresponse()
        raw = reply.read()
        if missing and reply.status == 404:
            return None
        if reply.status not in (200, 201, 204, 304):
            raise RuntimeError(f"Docker {method} {path}: HTTP {reply.status}")
        return json.loads(raw) if raw else {}
    finally:
        engine.close()


def operate(action, app, image):
    project = os.environ["APP_PROJECT"]
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", project) or not re.fullmatch(r"[a-z][a-z0-9-]{0,62}", app):
        raise ValueError("Invalid project or application ID")
    if action == "resolve":
        return {"image_id": request("GET", "/images/" + quote(image, safe="") + "/json")["Id"]}
    labels = {"io.skynet.project": project, "io.skynet.app": app}
    name = project + "-app-" + app
    record = request("GET", f"/containers/{name}/json", missing=True)
    if record and not labels.items() <= record["Config"]["Labels"].items():
        raise ValueError("Container name belongs to a different application")
    if action == "start":
        database = json.load(sys.stdin)
        env = {k: os.environ[k] for k in ("APP_CENTER_PORT", "SKYNET_CFG_CHANNEL", "APP_MONGO_HOST", "APP_MONGO_PORT")}
        env.update(APP_ID=app, NODE_CONTROL_FILES="1", APP_MONGO_DATABASE=database["name"],
                   APP_MONGO_AUTH_DB=database["authdb"], APP_MONGO_USERNAME=database["username"],
                   APP_MONGO_PASSWORD=database["password"])
        host = {"NetworkMode": "host", "Init": True, "CapDrop": ["ALL"], "SecurityOpt": ["no-new-privileges:true"]}
        if app == "agent":
            env.update({k: os.environ[k] for k in ("APP_INSTANCES", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL",
                        "DEEPSEEK_BASE_URL", "AGENT_TOOL_TCP_PORTS") if k in os.environ})
            host["Mounts"] = [{"Type": "volume", "Source": project + "_agent-work", "Target": "/work"}]
        image_id = request("GET", "/images/" + quote(image, safe="") + "/json")["Id"]
        settings = {k + "=" + v for k, v in env.items()}
        outdated = bool(record and (record["Image"] != image_id or not settings.issubset(record["Config"]["Env"])))
        if outdated and not record["State"]["Running"]:
            request("DELETE", "/containers/" + record["Id"])
            record = None
            outdated = False
        if not record:
            env["APP_REGISTRATION_KEY"] = secrets.token_hex(32)
            labels["io.skynet.app-databases"] = "1"
            created = request("POST", "/containers/create?name=" + name,
                              {"Image": image, "Labels": labels, "Env": [k + "=" + v for k, v in env.items()],
                               "HostConfig": host})
            record = request("GET", "/containers/" + created["Id"] + "/json")
        if not record["State"]["Running"]:
            request("POST", "/containers/" + record["Id"] + "/start")
        return {"outdated": outdated}
    if action == "inspect":
        if not record or not record["State"]["Running"]:
            return {"running": False}
        key = next(value.split("=", 1)[1] for value in record["Config"]["Env"]
                   if value.startswith("APP_REGISTRATION_KEY="))
        return {"running": True, "key": key}
    if action not in ("wait", "stop", "remove"):
        raise ValueError("Unknown container action")
    if not record:
        return {"exit_code": 0}
    path = "/containers/" + record["Id"]
    if action == "stop" and record["State"]["Running"]:
        request("POST", path + "/stop")
    if action == "wait":
        result = request("POST", path + "/wait")
        if result["StatusCode"] != 0:
            raise RuntimeError("Application exited with status " + str(result["StatusCode"]))
    if request("GET", path + "/json")["State"]["Running"]:
        raise RuntimeError("Application is still running")
    if action == "remove":
        request("DELETE", path)
    return {"exit_code": 0}


if __name__ == "__main__":
    result = operate(*sys.argv[1:])
    if sys.argv[1] == "start":
        sys.exit(3 if result["outdated"] else 0)
    print(json.dumps(result))
