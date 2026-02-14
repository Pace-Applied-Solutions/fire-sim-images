import { DEFAULT_SCENARIO_INPUTS, VIEWPOINTS } from '@fire-sim/shared';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header>
        <h1>NSW RFS Fire Simulation Inject Tool</h1>
        <p>AI-powered bushfire simulation for training scenarios</p>
      </header>
      <main style={{ marginTop: '2rem' }}>
        <h2>Status</h2>
        <p>✅ React app is running</p>
        <p>✅ Shared types imported successfully</p>
        <details style={{ marginTop: '1rem' }}>
          <summary>View configuration</summary>
          <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
            {JSON.stringify(
              {
                defaultInputs: DEFAULT_SCENARIO_INPUTS,
                availableViewpoints: Object.values(VIEWPOINTS),
              },
              null,
              2
            )}
          </pre>
        </details>
      </main>
    </div>
  );
}

export default App;
