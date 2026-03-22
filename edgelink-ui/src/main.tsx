import { createRoot } from 'react-dom/client'
import { App as AntdApp } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <AntdApp>
    <App />
  </AntdApp>,
)
