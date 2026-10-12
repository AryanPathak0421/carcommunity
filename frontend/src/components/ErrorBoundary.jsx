import React from 'react'
import { AlertCircle } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-black text-rose-900 mb-2">Something went wrong</h2>
          <p className="text-sm font-semibold text-rose-700 mb-4">
            {this.state.error?.toString()}
          </p>
          {this.state.errorInfo && (
            <pre className="text-[10px] text-left w-full bg-white p-4 rounded-xl overflow-auto text-rose-900 border border-rose-100">
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            type="button"
            className="mt-6 px-6 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
