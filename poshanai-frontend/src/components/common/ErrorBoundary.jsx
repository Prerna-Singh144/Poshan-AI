import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#F9FBF9] p-6 font-minecraft text-black">
          <section className="w-full max-w-xl border-4 border-black bg-white p-8 shadow-[6px_6px_0px_#000]">
            <h1 className="mb-4 text-2xl font-bold text-[#1E5631]">The page hit a problem</h1>
            <p className="mb-6">Reload PoshanAI to try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="border-4 border-black bg-[#1E5631] px-5 py-3 font-bold text-white shadow-[4px_4px_0px_#000]"
            >
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
