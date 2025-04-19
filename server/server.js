const express = require("express");
const cors = require("cors");
const { Octokit } = require("octokit");
const { OpenAI } = require("openai");
const { diffLines } = require("diff");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize MongoDB connection
mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/changelogger",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);

// Define Changelog Entry Schema
const changelogEntrySchema = new mongoose.Schema({
    owner: String,
    repo: String,
    version: String,
    date: { type: Date, default: Date.now },
    content: String,
    changes: [
        {
            type: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            impact: {
                type: String,
                required: true,
            },
        },
    ],
    isPublished: { type: Boolean, default: false },
});

const ChangelogEntry = mongoose.model("ChangelogEntry", changelogEntrySchema);

// Initialize OpenAI and Octokit
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to get file content from GitHub
async function getFileContent(owner, repo, path, ref) {
    try {
        const response = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/{path}",
            {
                owner,
                repo,
                path,
                ref,
            }
        );
        return Buffer.from(response.data.content, "base64").toString();
    } catch (error) {
        if (error.status === 404) {
            return ""; // Return empty string if file doesn't exist
        }
        console.error("Error fetching file content:", error);
        throw error;
    }
}

// Helper function to truncate text to a maximum number of tokens
function truncateText(text, maxTokens = 4000) {
    // Rough estimation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + "\n... (content truncated)";
}

// Helper function to generate changelog using OpenAI
async function generateChangelog(changedFiles) {
    try {
        // Create a summary of changes first
        const changeSummary = changedFiles
            .map((file) => {
                const additions = file.diff.filter(
                    (part) => part.type === "added"
                ).length;
                const removals = file.diff.filter(
                    (part) => part.type === "removed"
                ).length;
                return `File: ${file.path}\nChanges: ${additions} additions, ${removals} removals`;
            })
            .join("\n");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a technical writer and code reviewer. Write clear, assertive descriptions of code changes using declarative language. Focus on:\n" +
                        "1. The concrete functional impact of the changes\n" +
                        "2. The specific purpose and motivation behind the changes\n" +
                        "3. The direct implications and effects\n" +
                        "4. The precise technical details of the changes\n\n" +
                        "Format your response in Markdown with appropriate emojis to highlight different types of changes:\n" +
                        "🚀 New features or major improvements\n" +
                        "🐛 Bug fixes and error corrections\n" +
                        "🔧 Code refactoring and optimizations\n" +
                        "📝 Documentation and comment updates\n" +
                        "🛡️ Security-related changes\n" +
                        "🧪 Test-related changes\n\n" +
                        "Use declarative statements like:\n" +
                        "- 'Adds feature X that enables Y'\n" +
                        "- 'Fixes issue with Z by implementing W'\n" +
                        "- 'Improves performance by optimizing V'\n" +
                        "- 'Updates documentation to clarify U'\n\n" +
                        "Avoid tentative language like 'may', 'might', 'could', or 'should'. Be specific and confident in describing what changed and why.\n\n" +
                        "Do not use main titles (h1) in your markdown output. Start with h2 or lower for any headings.",
                },
                {
                    role: "user",
                    content: `Please analyze these code changes and describe their specific impact and purpose:\n\n${changeSummary}`,
                },
            ],
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Error generating changelog:", error);
        throw error;
    }
}

// Helper function to get all files in a repository at a specific ref
async function getFilesInRepo(owner, repo, ref) {
    try {
        const response = await octokit.request(
            "GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1",
            {
                owner,
                repo,
                ref,
            }
        );
        return response.data.tree.filter((item) => item.type === "blob");
    } catch (error) {
        console.error("Error fetching repository files:", error);
        throw error;
    }
}

// Helper function to compare file contents
async function compareFile(owner, repo, path, baseRef, headRef) {
    try {
        const baseContent = await getFileContent(owner, repo, path, baseRef);
        const headContent = await getFileContent(owner, repo, path, headRef);

        // If both contents are empty, skip the file
        if (!baseContent && !headContent) {
            return null;
        }

        // If one version is empty, treat it as a full file addition/removal
        if (!baseContent || !headContent) {
            const changes = [
                {
                    type: !baseContent ? "added" : "removed",
                    value: baseContent || headContent,
                },
            ];
            return {
                path,
                diff: changes,
            };
        }

        const changes = diffLines(baseContent, headContent);
        if (changes.some((part) => part.added || part.removed)) {
            return {
                path,
                diff: changes.map((part) => ({
                    type: part.added
                        ? "added"
                        : part.removed
                        ? "removed"
                        : "unchanged",
                    value: part.value,
                })),
            };
        }
        return null;
    } catch (error) {
        console.error(`Error comparing file ${path}:`, error);
        return null;
    }
}

// API endpoint to compare versions
app.post("/api/compare", async (req, res) => {
    try {
        const { owner, repo, baseRef, headRef } = req.body;

        // Get all files in both versions
        const baseFiles = await getFilesInRepo(owner, repo, baseRef);
        const headFiles = await getFilesInRepo(owner, repo, headRef);

        // Create a map of all unique files
        const allFiles = new Map();
        [...baseFiles, ...headFiles].forEach((file) => {
            allFiles.set(file.path, file);
        });

        // Compare each file
        const fileComparisons = await Promise.all(
            Array.from(allFiles.keys()).map(async (path) => {
                return await compareFile(owner, repo, path, baseRef, headRef);
            })
        );

        // Filter out unchanged files and null results
        const changedFiles = fileComparisons.filter(Boolean);

        // Generate changelog for all changes
        const changelog = await generateChangelog(changedFiles);

        res.json({
            files: changedFiles,
            changelog,
        });
    } catch (error) {
        console.error("Error in comparison:", error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to save a changelog entry
app.post("/api/changelog", async (req, res) => {
    try {
        const { owner, repo, version, content, changes, isPublished } =
            req.body;

        // Find and update existing entry or create a new one
        const entry = await ChangelogEntry.findOneAndUpdate(
            { owner, repo, version },
            {
                content,
                changes,
                isPublished,
                date: new Date(), // Update the date to now
            },
            {
                new: true, // Return the updated document
                upsert: true, // Create if doesn't exist
            }
        );

        res.json(entry);
    } catch (error) {
        console.error("Error saving changelog:", error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to get all changelog entries for a repo
app.get("/api/changelog/:owner/:repo", async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const entries = await ChangelogEntry.find({
            owner,
            repo,
            isPublished: true,
        }).sort({ date: -1 });
        res.json(entries);
    } catch (error) {
        console.error("Error fetching changelog entries:", error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to publish/unpublish a changelog entry
app.put("/api/changelog/:id/publish", async (req, res) => {
    try {
        const { id } = req.params;
        const { isPublished } = req.body;
        const entry = await ChangelogEntry.findByIdAndUpdate(
            id,
            { isPublished },
            { new: true }
        );
        res.json(entry);
    } catch (error) {
        console.error("Error updating changelog entry:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
