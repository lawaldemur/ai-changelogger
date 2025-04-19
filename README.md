# AI Changelogger

An AI-powered tool for generating and managing changelogs for GitHub repositories. This project consists of two main components:

1. A developer tool for generating changelogs using AI
2. A public-facing website for displaying changelogs

## Features

-   **AI-Powered Changelog Generation**: Uses OpenAI's GPT model to analyze code changes and generate human-readable changelog entries
-   **Version Comparison**: Compare any two versions (branches or tags) of a GitHub repository
-   **Changelog Management**: Save, edit, and publish changelog entries
-   **Public Changelog Page**: Clean, user-friendly interface for viewing changelogs
-   **Search Functionality**: Search through changelog entries
-   **Responsive Design**: Works well on both desktop and mobile devices

## Technical Decisions

### Frontend

-   **React**: Chosen for its component-based architecture and rich ecosystem
-   **React Router**: For handling navigation between the generator and public changelog pages
-   **React Markdown**: For rendering changelog content with proper formatting
-   **CSS Modules**: For scoped styling and better maintainability
-   **Responsive Design**: Mobile-first approach with media queries for different screen sizes

### Backend

-   **Node.js with Express**: For building a robust and scalable API
-   **MongoDB**: For storing changelog entries with flexible schema
-   **GitHub API (via Octokit)**: For fetching repository data and comparing versions
-   **OpenAI API**: For generating human-readable changelog entries

### Architecture

-   **Client-Server Architecture**: Clear separation between frontend and backend
-   **RESTful API**: For communication between client and server
-   **Modular Design**: Components and routes are organized for easy maintenance
-   **Environment Variables**: For secure configuration management

## Getting Started

### Prerequisites

-   Node.js (v14 or higher)
-   MongoDB
-   GitHub API token
-   OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ai-changelogger.git
cd ai-changelogger
```

2. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Create a `.env` file in the server directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/changelogger
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_api_key
```

4. Start the development servers:

```bash
# Start the server
cd server
npm start

# Start the client (in a new terminal)
cd client
npm start
```

## Usage

1. Visit `http://localhost:3000` in your browser
2. Enter the GitHub repository details (owner, repo name, base version, and new version)
3. Click "Generate Changelog" to create a new changelog entry
4. Review and edit the generated changelog if needed
5. Save and publish the changelog
6. View the public changelog page at `http://localhost:3000/changelog/:owner/:repo`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
