import Foundation
import WebKit

public enum AppPresentation {
    /// Seed the UI before its module executes, so the first render uses committed state and theme.
    public static func bootstrap(snapshot: [String: Any], presentationId: String) throws -> WKUserScript {
        let json = String(data: try jsonData(snapshot), encoding: .utf8)!
        let identity = String(data: try jsonData(presentationId), encoding: .utf8)!
        return WKUserScript(
            source: """
                (() => {
                    const handler = window.webkit.messageHandlers.skynet;
                    const post = handler.postMessage.bind(handler);
                    Object.defineProperty(window, "__skynetTransport", {
                        value: Object.freeze({postMessage: message => post(message)}),
                        writable: false, configurable: false
                    });
                })();
                window.__skynetInitialSnapshot = \(json);
                window.__skynetPresentationId = \(identity);
                (() => {
                    const preferences = window.__skynetInitialSnapshot.preferences;
                    const root = document.documentElement;
                    root.classList.toggle("dark", preferences.appearance === "dark" ||
                        (preferences.appearance === "system" && matchMedia("(prefers-color-scheme: dark)").matches));
                    root.dataset.reduceMotion = String(preferences.reduceMotion);
                })();
                """,
            injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }
}

public final class AppAssets: NSObject, WKURLSchemeHandler {
    let entry: AppCatalog.Entry
    private var active = Set<ObjectIdentifier>()
    public init(entry: AppCatalog.Entry) { self.entry = entry }
    public func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, url.host == entry.manifest.id,
            let decoded = url.path.removingPercentEncoding, !decoded.contains(".."),
            entry.manifest.files[String(decoded.dropFirst())] != nil
        else {
            urlSchemeTask.didFailWithError(HostError("path", "Asset path denied"))
            return
        }
        let key = ObjectIdentifier(urlSchemeTask)
        active.insert(key)
        let path = String(decoded.dropFirst())
        DispatchQueue.global(qos: .userInitiated).async {
            let result: Result<Data, Error> = Result {
                var data = try Data(contentsOf: self.entry.root.appendingPathComponent(path))
                if path.hasSuffix(".html") {
                    let policy =
                        "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'"
                    data =
                        Data(
                            "<!doctype html><meta http-equiv=\"Content-Security-Policy\" content=\"\(policy)\">"
                                .utf8) + data
                }
                return data
            }
            DispatchQueue.main.async {
                guard self.active.remove(key) != nil else { return }
                do {
                    let data = try result.get()
                    let mime =
                        [
                            "html": "text/html", "js": "application/javascript", "css": "text/css",
                            "svg": "image/svg+xml", "png": "image/png", "woff2": "font/woff2",
                        ][url.pathExtension] ?? "application/octet-stream"
                    let response = HTTPURLResponse(
                        url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                        headerFields: [
                            "Content-Type": mime, "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "no-store",
                        ])!
                    urlSchemeTask.didReceive(response)
                    urlSchemeTask.didReceive(data)
                    urlSchemeTask.didFinish()
                } catch { urlSchemeTask.didFailWithError(error) }
            }
        }
    }
    public func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        active.remove(ObjectIdentifier(urlSchemeTask))
    }
}
