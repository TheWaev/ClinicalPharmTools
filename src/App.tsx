import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import { availableTools } from './tools/registry';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        {availableTools.map((tool) => {
          const Tool = tool.component;
          return <Route key={tool.slug} path={`/tools/${tool.slug}`} element={<Tool />} />;
        })}
        {/* Friendly redirect for the bare /tools path. */}
        <Route path="/tools" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
