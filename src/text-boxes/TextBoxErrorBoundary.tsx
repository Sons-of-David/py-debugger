import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  boxId: string;
  onDelete: (id: string) => void;
}

interface State {
  hasError: boolean;
}

export class TextBoxErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TextBox error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            border: '1px dashed #f87171',
            backgroundColor: 'rgba(254, 226, 226, 0.5)',
            color: '#b91c1c',
            fontSize: 12,
            cursor: 'pointer',
            boxSizing: 'border-box',
            padding: 4,
          }}
          title="Text box encountered an error. Click to remove."
          onClick={() => this.props.onDelete(this.props.boxId)}
        >
          ⚠ text box error — click to remove
        </div>
      );
    }
    return this.props.children;
  }
}
