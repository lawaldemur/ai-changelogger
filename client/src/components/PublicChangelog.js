import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router-dom";
import "./PublicChangelog.css";

const API_BASE_URL = "http://localhost:5001";

function PublicChangelog() {
    const { owner, repo } = useParams();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredEntries, setFilteredEntries] = useState([]);

    useEffect(() => {
        const fetchChangelogEntries = async () => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/changelog/${owner}/${repo}`
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch changelog entries");
                }
                const data = await response.json();
                setEntries(data);
                setFilteredEntries(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchChangelogEntries();
    }, [owner, repo]);

    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredEntries(entries);
        } else {
            const filtered = entries.filter(
                (entry) =>
                    entry.content
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    entry.version
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
            );
            setFilteredEntries(filtered);
        }
    }, [searchTerm, entries]);

    if (loading) {
        return <div className="loading">Loading changelog...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="public-changelog">
            <header className="changelog-header">
                <h1>
                    {owner}/{repo}
                </h1>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search changelog..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </header>

            <main className="changelog-content">
                {filteredEntries.length === 0 ? (
                    <div className="no-results">
                        No changelog entries found
                        {searchTerm ? ` matching "${searchTerm}"` : ""}
                    </div>
                ) : (
                    filteredEntries.map((entry) => (
                        <article key={entry._id} className="changelog-entry">
                            <div className="entry-header">
                                <h2>Version {entry.version}</h2>
                                <time dateTime={entry.date}>
                                    {new Date(entry.date).toLocaleDateString()}
                                </time>
                            </div>
                            <div className="entry-content">
                                <ReactMarkdown>{entry.content}</ReactMarkdown>
                            </div>
                        </article>
                    ))
                )}
            </main>
        </div>
    );
}

export default PublicChangelog;
