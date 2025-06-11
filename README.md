# 🌿 AncesTree

**AncesTree** is a Pokédex-style React Native app that helps users identify plants, fungi, and trees — with a focus on their ancestral medicinal properties. It combines AI-powered plant recognition with a growing community knowledge base, allowing people to reconnect with nature, healing, and wisdom.

> “Because every leaf has a purpose.”

---

## ✨ Features

- 📸 Take a photo of any plant or fungus
- 🤖 Uses [Plant.id](https://web.plant.id/) API to identify species
- 🧠 Extracts healing properties from wiki descriptions (e.g. *anti-inflammatory*, *antifungal*)
- 🗂️ Caches species data using [Convex](https://convex.dev) for offline-aware querying
- 🧾 Shows results in a beautiful, Pokédex-style UI
- 🔁 (Planned) Learns recursively from user data for smarter, offline use in the future

---

## 📱 Tech Stack

| Layer      | Stack                     |
|------------|---------------------------|
| Frontend   | React Native (Expo)       |
| Backend    | Convex DB + Actions       |
| Image ID   | Plant.id API              |
| Language   | TypeScript                |
| Styling    | Tailwind (via NativeWind) |
| Offline DB | (planned) SQLite/TF Lite  |

---

## 🧪 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourname/ancestree.git
cd ancestree
