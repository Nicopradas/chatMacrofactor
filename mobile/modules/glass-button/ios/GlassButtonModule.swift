import ExpoModulesCore
import UIKit

public class GlassButtonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GlassButton")

    View(GlassButtonView.self) {
      Events("onPress")

      Prop("systemImage") { (view: GlassButtonView, name: String) in
        view.setSystemImage(name)
      }

      Prop("tintColor") { (view: GlassButtonView, color: UIColor?) in
        view.setTintColor(color)
      }

      Prop("prominent") { (view: GlassButtonView, prominent: Bool) in
        view.setProminent(prominent)
      }

      Prop("symbolSize") { (view: GlassButtonView, size: Double) in
        view.setSymbolSize(size)
      }
    }
  }
}

class GlassButtonView: ExpoView {
  let onPress = EventDispatcher()
  private let button = UIButton(type: .system)

  private var prominent = false
  private var symbolName: String?
  private var symbolSize: CGFloat = 18

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    // El cristal "rebosa" un poco fuera de los límites: no recortar.
    clipsToBounds = false
    button.tintColor = .label

    button.addTarget(self, action: #selector(handlePress), for: .touchUpInside)
    addSubview(button)
    button.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      button.topAnchor.constraint(equalTo: topAnchor),
      button.bottomAnchor.constraint(equalTo: bottomAnchor),
      button.leadingAnchor.constraint(equalTo: leadingAnchor),
      button.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])

    applyConfiguration()
  }

  private func applyConfiguration() {
    var config: UIButton.Configuration
    if #available(iOS 26.0, *) {
      config = prominent ? .prominentGlass() : .glass()
    } else {
      // Fallback para iOS < 26: cápsula gris translúcida.
      config = .gray()
    }
    config.cornerStyle = .capsule
    config.image = currentImage()
    button.configuration = config
  }

  private func currentImage() -> UIImage? {
    guard let name = symbolName else { return nil }
    let cfg = UIImage.SymbolConfiguration(pointSize: symbolSize, weight: .semibold)
    return UIImage(systemName: name, withConfiguration: cfg)
  }

  func setSystemImage(_ name: String) {
    symbolName = name
    button.configuration?.image = currentImage()
  }

  func setTintColor(_ color: UIColor?) {
    button.tintColor = color ?? .label
  }

  func setProminent(_ value: Bool) {
    prominent = value
    applyConfiguration()
  }

  func setSymbolSize(_ size: Double) {
    symbolSize = CGFloat(size)
    button.configuration?.image = currentImage()
  }

  @objc private func handlePress() {
    onPress()
  }
}
