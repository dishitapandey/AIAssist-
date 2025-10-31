# AIAssist+ Suite  
### _Turn your browser into your brain’s sidekick._

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)
![Built With](https://img.shields.io/badge/Built%20With-HTML%2C%20CSS%2C%20JS-yellow)
![Hackathon](https://img.shields.io/badge/Made%20For-Chrome%20AI%20Hackathon%202025-red)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview
**AIAssist+** is a Chrome Extension that transforms any webpage into an AI-powered workspace using **Chrome’s built-in Gemini Nano** and the **Prompt API**.  
It reads, rewrites, translates, and remembers what you browse — all _within your tab_ — bringing seamless, privacy-first intelligence to the web.

## Features

 **Summarize Anything** – Select text or whole pages to get concise, readable summaries.  
 **Rewrite with Style** – Rephrase or refine content instantly in multiple tones.  
 **Translate Instantly** – Convert any text on the web into your preferred language.  
 **Proofread & Polish** – Grammar, clarity, and tone corrections with a single click.  
 **Page Memory** – Saves webpage insights locally for future recall — your browser now has memory!  
 **Personas** – Choose “Analyst,” “Journalist,” “Friendly Explainer,” or “Creative Writer” for custom AI tones.  
 **Offline Demo Mode** – Judges can test it without any API keys or network setup.  
 **Streaming UI** – Real-time token-by-token generation for a ChatGPT-like experience.

## Tech Stack / Built With

- **Languages:** HTML5, CSS3, JavaScript (ES6)  
- **Platform:** Chrome Extension (Manifest V3)  
- **APIs:**  
  - Chrome **Prompt API**  
  - Chrome **Summarizer API**  
  - Chrome **Translator API**  
  - Chrome **Writer / Rewriter / Proofreader APIs**  
  - **Gemini Nano** (on-device AI)  
  - Chrome **Storage API**, **ContextMenus API**, **Runtime Messaging API**  
- **Tools:** VS Code, Git, GitHub  
- **Data:** JSON (for demo responses & personas)

## Problem Solved

The modern web is noisy — we constantly jump between tabs, summarizers, translators, and note tools.  
**AIAssist+** brings all those capabilities **into the browser itself**, so users can read, summarize, and learn faster without ever leaving the page.  
It’s privacy-first, fast, and built for everyday productivity.

## How It Works

1. **Right-click** on any text → choose an AIAssist+ action (Summarize, Rewrite, Translate, etc.).  
2. **Popup panel** streams AI responses in real time.  
3. **Page Memory** stores key info (title, paragraphs, headings) locally via `chrome.storage.local`.  
4. **Personas** apply tailored prompt templates for different tones or tasks.  
5. **Offline Demo Mode** simulates AI responses for instant judging, while the live mode connects to Gemini Nano or APIs.
