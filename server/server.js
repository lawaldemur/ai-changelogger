const express = require("express");
const cors = require("cors");
const { Octokit } = require("octokit");
const { OpenAI } = require("openai");
const { diffLines } = require("diff");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

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
        console.error("Error fetching file content:", error);
        throw error;
    }
}

// Helper function to generate changelog using OpenAI
async function generateChangelog(diff) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a technical writer. Analyze the code changes and provide a clear, concise description of what changed. Focus on the functional impact of the changes.",
                },
                {
                    role: "user",
                    content: `Please analyze these code changes and describe them in plain English:\n\n${diff}`,
                },
            ],
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Error generating changelog:", error);
        throw error;
    }
}

// API endpoint to compare versions
app.post("/api/compare", async (req, res) => {
    try {
        const { owner, repo, path, baseRef, headRef } = req.body;

        // Get content for both versions
        const baseContent = await getFileContent(owner, repo, path, baseRef);
        const headContent = await getFileContent(owner, repo, path, headRef);

        // Generate diff
        const changes = diffLines(baseContent, headContent);
        const diff = changes
            .map(
                (part) =>
                    (part.added ? "+" : part.removed ? "-" : " ") + part.value
            )
            .join("");

        // Generate changelog using OpenAI
        const changelog = await generateChangelog(diff);

        res.json({
            diff,
            changelog,
        });
    } catch (error) {
        console.error("Error in comparison:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
