# GitHub Roast

AI-powered GitHub profile roaster. Connect your GitHub account and get a personalized, humorous critique of your coding habits.

## Features

- GitHub OAuth authentication
- Profile and repository analysis
- Commit pattern analysis (late night coding, weekend commits)
- AI-generated roast using OpenAI
- Adjustable intensity (mild, medium, savage)
- Clean, shareable roast card

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: `GitHub Roast`
   - Homepage URL: `http://localhost:3300`
   - Authorization callback URL: `http://localhost:3300/callback`
4. Click "Register application"
5. Copy the Client ID
6. Generate and copy a Client Secret

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your credentials:

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
OPENAI_API_KEY=sk-...
PORT=3300
```

### 4. Run

```bash
npm run dev
```

Server starts at `http://localhost:3300`

## Usage

### With ChatGPT Desktop

1. Add the MCP server in ChatGPT settings
2. Ask: "Open the GitHub Roast dashboard"
3. Click "Connect GitHub"
4. Complete OAuth in browser
5. View your roast

### Direct Access

Open `http://localhost:3300` in your browser.

## MCP Tools

| Tool | Description |
|------|-------------|
| `openRoastDashboard` | Open the roast dashboard UI |
| `authenticateGitHub` | Authenticate with GitHub OAuth |
| `fetchGitHubProfile` | Fetch user profile data |
| `fetchGitHubRepos` | Fetch repository list |
| `fetchCommitStats` | Analyze commit patterns |
| `analyzeProfile` | Generate roast statistics |
| `generateRoast` | Create AI-powered roast |

## Project Structure

```
github-roast/
├── main.ts              # Server entry
├── package.json
├── .env.example
└── mcp/
    ├── config.ts        # OAuth configuration
    ├── github/
    │   └── index.ts     # GitHub API service
    ├── analysis/
    │   └── index.ts     # Profile analyzer
    ├── roast/
    │   └── index.ts     # AI roast generator
    └── dashboard/
        ├── index.ts     # @GPTApp entry
        └── RoastDashboard.tsx
```

## Analysis Points

The roast analyzes:

- Account age and activity
- Repository quality (licenses, descriptions)
- Star/fork counts
- Commit timing (late night, weekends)
- Commit message quality
- Language distribution
- Abandoned projects
- Follower/following ratio

## License

MIT
