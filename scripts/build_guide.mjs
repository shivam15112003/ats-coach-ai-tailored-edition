// One native layout keeps the PowerPoint, in-app slides, and video visuals identical.
// Set ARTIFACT_MODULES, PRESENTATIONS_SKILL, and RUNTIME_PYTHON to the bundled runtime.
process.env.RUNTIME_NODE_MODULES ||= process.env.ARTIFACT_MODULES;
process.argv.push('--export-slides');
await import('./render_walkthrough.mjs');
