import json
import os
import signal
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer


class Manager(HTTPServer):
    process = None

    def stop_app(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=10)


class Handler(BaseHTTPRequestHandler):
    def reply(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        assert self.path == "/apps"
        self.reply([dict(app_id="agent", service="127.0.0.1", name="Agent", default_enabled=True,
                         running=self.server.process is not None and self.server.process.poll() is None)])

    def do_POST(self):
        if self.path == "/apps/agent/start":
            if not self.server.process or self.server.process.poll() is not None:
                self.server.process = subprocess.Popen(["3rd/skynet/skynet", "etc/config.app"],
                    env=dict(os.environ, APP_ID="agent", APP_SCHEMA="agent/schema.proto"))
        elif self.path == "/apps/agent/stop":
            self.server.stop_app()
        elif self.path == "/apps/agent/wait":
            self.reply({"exit_code": self.server.process.wait(timeout=20)})
            return
        else:
            self.send_error(404)
            return
        self.reply({"ok": True})


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: exit(0))
    with Manager(("127.0.0.1", 18081), Handler) as server:
        try:
            server.serve_forever()
        finally:
            server.stop_app()
