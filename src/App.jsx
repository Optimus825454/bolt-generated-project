import React, { useState, useEffect } from 'react';
    import './App.css';

    function App() {
      const [message, setMessage] = useState('Veriler güncelleniyor...');

      useEffect(() => {
        fetch('/api/update')
          .then(response => response.text())
          .then(data => setMessage(data))
          .catch(error => setMessage('Veri güncelleme hatası: ' + error.message));
      }, []);

      return (
        <div className="app">
          <header className="app-header">
            <h1>Siberpunk Hisse Uygulaması</h1>
          </header>
          <main>
            <p>{message}</p>
          </main>
          <footer>
            <p>Erkan | Bolt</p>
          </footer>
        </div>
      );
    }

    export default App;
