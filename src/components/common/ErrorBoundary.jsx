import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('Route error boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <section className="empty-state route-error-state" role="alert">
          <strong>Something glitched</strong>
          <p>Refresh the page or switch tabs. Your account data is still safe.</p>
          <button className="auth-submit" onClick={() => this.setState({ error: null })} type="button">
            Try again
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
