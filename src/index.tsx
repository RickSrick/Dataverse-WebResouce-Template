import ReactDOM from 'react-dom/client';
import App from './App';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>,
  );
}
