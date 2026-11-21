import http.client
import json
import logging
import os
import re
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode


class Engine(http.client.HTTPConnection):
    api_prefix = ""

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect("/var/run/docker.sock")


def engine(method, path):
    connection = Engine("localhost", timeout=20)
    try:
        connection.request(method, Engine.api_prefix + path)
        response = connection.getresponse()
        body = response.read()
        if response.status not in (200, 204, 304):
            raise RuntimeError(f"Docker {method} returned {response.status}")
        return json.loads(body) if body else None
    finally:
        connection.close()


def catalog():
    filters = {"label": ["com.docker.compose.project=" + os.environ["PROJECT"], "io.skynet.app"]}
    containers = engine("GET", "/containers/json?" + urlencode({"all": 1, "filters": json.dumps(filters)}))
    apps = {}
    for container in containers:
        labels = container["Labels"]
        if labels.get("com.docker.compose.oneoff", "").lower() == "true":
            continue
        app = labels["io.skynet.app"]
        service = labels["com.docker.compose.service"]
        if app in apps or app in ("login", "app-center") or not re.fullmatch(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*", app):
            raise ValueError("Invalid or duplicated application ID")
        if len(app) > 63 or not re.fullmatch(r"[a-z][a-z0-9-]{0,62}", service):
            raise ValueError("Invalid Compose service name")
        apps[app] = (container["Id"], dict(app_id=app, service=service, name=labels.get("io.skynet.name", app),
                         running=container["State"] == "running", default_enabled=labels.get("io.skynet.enabled") == "true"))
    return apps


class Manager(BaseHTTPRequestHandler):
    def handle_call(self, method):
        try:
            apps = catalog()
            if method == "GET" and self.path == "/apps":
                result = [definition for _, definition in apps.values()]
            else:
                match = re.fullmatch(r"/apps/([a-z0-9-]+)/(start|stop|wait)", self.path)
                if method != "POST" or not match or match[1] not in apps:
                    self.send_error(404)
                    return
                identifier = apps[match[1]][0]
                container = "/containers/" + identifier
                response = engine("POST", container + "/" + match[2])
                if match[2] in ("stop", "wait") and engine("GET", container + "/json")["State"]["Running"]:
                    raise RuntimeError("Application container is still running")
                result = {"exit_code": response["StatusCode"]} if match[2] == "wait" else {"ok": True}
            data = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (ValueError, OSError, RuntimeError, http.client.HTTPException):
            logging.exception("Container management failed")
            self.send_error(503)

    def do_GET(self):
        self.handle_call("GET")

    def do_POST(self):
        self.handle_call("POST")

    def log_request(self, code="-", size="-"):
        if self.command != "GET" or code != 200:
            super().log_request(code, size)


if __name__ == "__main__":
    Engine.api_prefix = "/v" + engine("GET", "/version")["ApiVersion"]
    ThreadingHTTPServer(("0.0.0.0", 18081), Manager).serve_forever()
