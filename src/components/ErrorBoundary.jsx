import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Landet in der Browser-Konsole — hilft beim Debuggen, ohne die App zu blockieren.
    console.error('Filetool: unerwarteter Fehler', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <p className="error-boundary__title">Da ist etwas schiefgelaufen.</p>
          <p className="error-boundary__hint">
            Die Datei oder Einstellung hat ein Problem verursacht. Die App ist nicht abgestürzt —
            du kannst es direkt erneut versuchen oder die Seite neu laden.
          </p>
          <div className="error-boundary__actions">
            <button className="readout-reset" onClick={this.handleReset}>Erneut versuchen</button>
            <button className="readout-reset" onClick={() => window.location.reload()}>Seite neu laden</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
