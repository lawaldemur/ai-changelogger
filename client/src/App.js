import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    useLocation,
} from "react-router-dom";
import "./App.css";
import DiffViewer from "./components/DiffViewer";
import PublicChangelog from "./components/PublicChangelog";

const API_BASE_URL = "http://localhost:5001";

function Navigation({ owner, repo }) {
    const location = useLocation();
    const isGeneratorPage = location.pathname === "/";
    const isChangelogPage = location.pathname.startsWith("/changelog/");

    return (
        <nav className="main-nav">
            {!isGeneratorPage && (
                <Link to="/" className="nav-link">
                    Generator
                </Link>
            )}
            {!isChangelogPage && owner && repo && (
                <Link to={`/changelog/${owner}/${repo}`} className="nav-link">
                    View Public Changelog
                </Link>
            )}
        </nav>
    );
}

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
    const [showCopyNotification, setShowCopyNotification] = useState(false);
    const [showPublishNotification, setShowPublishNotification] =
        useState(false);

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

    const handleCopyChangelog = async () => {
        try {
            await navigator.clipboard.writeText(result.changelog);
            setShowCopyNotification(true);
            setTimeout(() => setShowCopyNotification(false), 2000);
        } catch (err) {
            console.error("Failed to copy changelog:", err);
        }
    };

    const handlePublishChangelog = async () => {
        if (!result) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/changelog`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    owner: formData.owner,
                    repo: formData.repo,
                    version: formData.headRef,
                    content: result.changelog,
                    changes: result.files.map((file) => ({
                        type: "code",
                        description: file.path,
                        impact: "Modified",
                    })),
                    isPublished: true,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to publish changelog");
            }

            setShowPublishNotification(true);
            setTimeout(() => setShowPublishNotification(false), 2000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Router>
            <div className="App">
                <header className="App-header">
                    <h1>AI Changelogger</h1>
                    <p>
                        Compare GitHub code versions and generate human-readable
                        changelogs
                    </p>
                    <Navigation owner={formData.owner} repo={formData.repo} />
                </header>

                <Routes>
                    <Route
                        path="/"
                        element={
                            <main className="App-main">
                                <form
                                    onSubmit={handleSubmit}
                                    className="compare-form"
                                >
                                    <div className="form-group">
                                        <label htmlFor="owner">
                                            Repository Owner:
                                        </label>
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
                                        <label htmlFor="repo">
                                            Repository Name:
                                        </label>
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
                                        {loading
                                            ? "Generating..."
                                            : "Generate Changelog"}
                                    </button>
                                </form>

                                {error && (
                                    <div className="error-message">
                                        <p>Error: {error}</p>
                                    </div>
                                )}

                                {result && (
                                    <div className="result-container">
                                        <div className="changelog-header">
                                            <h2>Generated Changelog</h2>
                                            <div className="changelog-actions">
                                                <button
                                                    onClick={
                                                        handleCopyChangelog
                                                    }
                                                    className="copy-button"
                                                    title="Copy changelog to clipboard"
                                                >
                                                    📄 Copy
                                                </button>
                                                <button
                                                    onClick={
                                                        handlePublishChangelog
                                                    }
                                                    className="publish-button"
                                                >
                                                    Publish
                                                </button>
                                            </div>
                                        </div>
                                        <div className="changelog">
                                            <ReactMarkdown>
                                                {result.changelog}
                                            </ReactMarkdown>
                                        </div>

                                        {showCopyNotification && (
                                            <div className="copy-notification">
                                                Markdown copied to clipboard
                                            </div>
                                        )}
                                        {showPublishNotification && (
                                            <div className="copy-notification">
                                                Changelog published successfully
                                            </div>
                                        )}

                                        <h3>Changed Files</h3>
                                        <div className="file-list">
                                            {result.files.map((file) => (
                                                <button
                                                    key={file.path}
                                                    className={`file-button ${
                                                        selectedFile?.path ===
                                                        file.path
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        setSelectedFile(file)
                                                    }
                                                >
                                                    {file.path}
                                                </button>
                                            ))}
                                        </div>

                                        {selectedFile && (
                                            <DiffViewer file={selectedFile} />
                                        )}
                                    </div>
                                )}
                            </main>
                        }
                    />
                    <Route
                        path="/changelog/:owner/:repo"
                        element={<PublicChangelog />}
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
