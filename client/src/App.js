import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/test")
            .then((res) => res.json())
            .then((data) => setMessage(data.message))
            .catch((err) => console.error("Error:", err));
    }, []);

    return (
        <div className="App">
            <header className="App-header">
                <h1>Express + React App</h1>
                <p>Backend message: {message}</p>
            </header>
        </div>
    );
}

export default App;
