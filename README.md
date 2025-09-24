# Only Auto Commit

**The simplest way to generate Git commit messages - powered by AI**

> One thing, done right. No bloat, no confusion. Just fast, intelligent commit message generation.

## Why Only Auto Commit?

Tired of complex extensions that try to do everything? **Only Auto Commit** does exactly what it says: automatically generates meaningful commit messages using AI. That's it.

### ✨ What makes it special:

- **Lightweight**: Minimal dependencies, fast startup, no performance impact
- **Simple**: One-click commit message generation, no complex workflows
- **Flexible**: Works with any OpenAI-compatible API or local LLM
- **Secure**: API keys stored safely using VS Code's built-in security
- **Fast**: Optimized for speed - get commit messages in seconds

## 🚀 Get Started in 60 Seconds

### 1. Install
Install from the VS Code Marketplace with this command:
```
ext install sunbankio.onlyautocommit
```

### 2. Configure (One-time setup)
- Open VS Code Settings
- Set your API endpoint (default: OpenAI)
- Set your model (default: gpt-3.5-turbo)
- Use "Only Auto Commit: Set API Key" command to securely store your API key

### 3. Use It
1. Stage your changes in Git
2. Click the "Generate Commit Message" button in Source Control
3. Review and commit - that's it!

## ⚙️ Simple Configuration

Just two settings to worry about:

- **API Endpoint**: Your LLM provider's URL (supports OpenAI, local models, etc.)
- **Model**: The AI model to use for generation

### VSCode Configuration Keys
- `onlyautocommit.baseUrl`
- `onlyautocommit.modelId`


### Ollama Configuration Example
To use with Ollama running on the default local port with the gpt-oss:20b model:
- **API Endpoint**: `http://localhost:11434/v1`
- **Model**: `gpt-oss:20b`

No complex workflows. No unnecessary options. It just works.

## 🔒 Security First

Your API keys are stored using VS Code's secure SecretStorage - clear text never written to disk or logged.

## 🤝 Compatibility

- **VS Code**: 1.74.0+
- **Git**: Any version (uses VS Code's built-in Git extension)
- **LLMs**: Any OpenAI-compatible API (OpenAI, Azure, local models, etc.)

## 📄 License

MIT License - Free to use, modify, and distribute.

---

**Only Auto Commit**: Because sometimes, the best tool is the one that does one thing perfectly.