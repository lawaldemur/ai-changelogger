import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import DiffViewer from "./components/DiffViewer";

function App() {
    const [formData, setFormData] = useState({
        owner: "",
        repo: "",
        baseRef: "",
        headRef: "",
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        setSelectedFile(null);

        try {
            const response = await fetch("/api/compare", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error("Failed to compare versions");
            }

            const data = await response.json();
            setResult(data);
            if (data.files.length > 0) {
                setSelectedFile(data.files[0]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>AI Changelogger</h1>
                <p>
                    Compare GitHub code versions and generate human-readable
                    changelogs
                </p>
            </header>

            <main className="App-main">
                <form onSubmit={handleSubmit} className="compare-form">
                    <div className="form-group">
                        <label htmlFor="owner">Repository Owner:</label>
                        <input
                            type="text"
                            id="owner"
                            name="owner"
                            value={formData.owner}
                            onChange={handleChange}
                            required
                            placeholder="e.g., facebook"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="repo">Repository Name:</label>
                        <input
                            type="text"
                            id="repo"
                            name="repo"
                            value={formData.repo}
                            onChange={handleChange}
                            required
                            placeholder="e.g., react"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="baseRef">
                            Base Version (Branch/Tag):
                        </label>
                        <input
                            type="text"
                            id="baseRef"
                            name="baseRef"
                            value={formData.baseRef}
                            onChange={handleChange}
                            required
                            placeholder="e.g., main"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="headRef">
                            New Version (Branch/Tag):
                        </label>
                        <input
                            type="text"
                            id="headRef"
                            name="headRef"
                            value={formData.headRef}
                            onChange={handleChange}
                            required
                            placeholder="e.g., feature/new-feature"
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? "Generating..." : "Generate Changelog"}
                    </button>
                </form>

                {error && (
                    <div className="error-message">
                        <p>Error: {error}</p>
                    </div>
                )}

                {result && (
                    <div className="result-container">
                        <h2>Changelog</h2>
                        <div className="changelog">
                            <ReactMarkdown>{result.changelog}</ReactMarkdown>
                        </div>

                        <h3>Changed Files</h3>
                        <div className="file-list">
                            {result.files.map((file) => (
                                <button
                                    key={file.path}
                                    className={`file-button ${
                                        selectedFile?.path === file.path
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => setSelectedFile(file)}
                                >
                                    {file.path}
                                </button>
                            ))}
                        </div>

                        {selectedFile && <DiffViewer file={selectedFile} />}
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
