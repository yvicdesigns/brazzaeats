import UIKit
import Capacitor

// viewport-fit=cover + safe-area CSS (env()) already handle insets manually —
// the default .automatic contentInsetAdjustmentBehavior fights that and races
// with the WKWebView's initial layout pass, making the page render wider than
// the screen until a rotation forces WebKit to recompute (observed on real
// devices, not the Simulator).
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView?.frame = view.bounds
    }
}
