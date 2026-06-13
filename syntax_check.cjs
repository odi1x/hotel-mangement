try {
  require('@babel/core').transformFileSync('src/components/views/SettingsView.jsx', {
    presets: ['@babel/preset-react']
  });
  console.log('Syntax OK');
} catch (e) {
  console.error(e.message);
}
