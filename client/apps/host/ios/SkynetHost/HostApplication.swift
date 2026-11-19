import SkynetHostCore
import UIKit

enum HostServices {
    static weak var delegate: AppDelegate?
    static var core: HostCore { delegate!.core }
}

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    private(set) var core: HostCore!
    private weak var workspaceController: WorkspaceController?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Skynet Agent")
        do {
            core = try HostCore(
                dataRoot: root, builtins: Bundle.main.resourceURL!.appendingPathComponent("builtins"))
        } catch { fatalError("HostCore initialization failed: \(error)") }
        HostServices.delegate = self
        return true
    }

    func connect(_ windowScene: UIWindowScene) -> UIWindow {
        let controller = WorkspaceController()
        workspaceController = controller
        controller.content = WorkspaceHost(frame: .zero)
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = controller
        window.makeKeyAndVisible()
        core.setServerConfirmation { [weak controller] origin, completion in
            guard let controller, controller.presentedViewController == nil,
                UIApplication.shared.applicationState == .active
            else {
                completion(false)
                return
            }
            let alert = UIAlertController(
                title: "允许工作区连接此服务器？",
                message: "\(origin)\n\n对话和任务信息会发送到该服务器。仅授权你信任的服务器。",
                preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completion(false) })
            alert.addAction(UIAlertAction(title: "允许连接", style: .default) { _ in completion(true) })
            controller.present(alert, animated: true)
        }
        return window
    }
    func updateChrome(_ colors: [String], lightContent: Bool) {
        workspaceController?.updateChrome(colors, lightContent: lightContent)
    }

    func background() {
        backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "Commit client suspension") {
            [weak self] in
            self?.finishBackgroundTask()
        }
        core.setBackgrounded(true) { [weak self] in
            DispatchQueue.main.async { self?.finishBackgroundTask() }
        }
    }
    func foreground() {
        core.setBackgrounded(false)
    }
    func applicationWillTerminate(_ application: UIApplication) {
        core.shutdown()
    }
    private func finishBackgroundTask() {
        guard backgroundTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(backgroundTask)
        backgroundTask = .invalid
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var appearanceObservation: UUID?
    func scene(
        _ scene: UIScene, willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let scene = scene as? UIWindowScene, let delegate = HostServices.delegate else { return }
        window = delegate.connect(scene)
        appearanceObservation = delegate.core.observe { [weak self] snapshot in
            let appearance = (snapshot["preferences"] as? [String: Any])?["appearance"] as? String
            DispatchQueue.main.async {
                self?.window?.overrideUserInterfaceStyle =
                    appearance == "dark" ? .dark : appearance == "light" ? .light : .unspecified
                self?.window?.rootViewController?.setNeedsStatusBarAppearanceUpdate()
            }
        }
    }
    func sceneDidEnterBackground(_ scene: UIScene) { HostServices.delegate?.background() }
    func sceneWillEnterForeground(_ scene: UIScene) { HostServices.delegate?.foreground() }
    func sceneDidDisconnect(_ scene: UIScene) {
        if let appearanceObservation { HostServices.core.unobserve(appearanceObservation) }
        appearanceObservation = nil
        window = nil
    }
}

private final class WorkspaceController: UIViewController {
    var content: UIView!
    private let chrome = CAGradientLayer()
    private var lightStatus = false
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        view.layer.insertSublayer(chrome, at: 0)
        content.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(content)
        // The native root owns safe areas and keyboard avoidance. Web content
        // receives the actual remaining viewport instead of a second inset.
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            content.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            content.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
        ])
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        lightStatus ? .lightContent : .darkContent
    }
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        chrome.frame = view.bounds
        CATransaction.commit()
    }
    func updateChrome(_ colors: [String], lightContent: Bool) {
        let colors = colors.count == 1 ? colors + colors : colors
        chrome.colors = colors.map { UIColor(hex: $0).cgColor }
        chrome.startPoint = .zero
        chrome.endPoint = CGPoint(x: 1, y: 1)
        lightStatus = lightContent
        setNeedsStatusBarAppearanceUpdate()
    }
}
