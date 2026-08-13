# 🚀 BigQuery Release Pulse

> A modern web application built with **Python Flask** and **Vanilla HTML/CSS/JavaScript** that aggregates Google Cloud BigQuery release notes in real time and empowers users to compose and share updates on X (Twitter) with a single click.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Armel--biloo--event--talks--app-blue?logo=github)](https://github.com/armelBiloo/Armel-biloo-event-talks-app)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Sommaire / Table of Contents
- [Aperçu des Fonctionnalités / Key Features](#-aperçu-des-fonctionnalités--key-features)
- [Architecture & Technologies](#-architecture--technologies)
- [Installation & Démarrage / Quick Start](#-installation--démarrage--quick-start)
- [Documentation des API / API Endpoints](#-documentation-des-api--api-endpoints)
- [Structure du Projet / Project Structure](#-structure-du-projet--project-structure)
- [Auteur & Licence / Author & License](#-auteur--licence--author--license)

---

## 🌟 Aperçu des Fonctionnalités / Key Features

- 📡 **Flux RSS Atom en Direct** : Ingestion automatique des notes de version officielles depuis Google Cloud (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
- 🔄 **Bouton de Rafraîchissement Interactif** : Bouton de mise à jour manuelle avec indicateur de statut et animation de spinner SVG.
- ⚡ **Catégorisation Intelligente** : Découpage automatique des notes par type de mise à jour (**🚀 Feature**, **📢 Announcement**, **⚡ Change**, **⚠️ Issue**, **🔒 Security**).
- 🔍 **Filtres & Recherche en Temps Réel** : Recherche textuelle instantanée par mots-clés (*Clean rooms*, *Iceberg*, *SQL*, *GA*, *TVF*) et filtrage par onglets de catégorie.
- 🐦 **Générateur & Composer de Tweet (X)** :
  - Sélection d'onglets de style (🚀 *Impact & News*, ⚡ *Quick Take*, 🛠️ *Tech Highlight*, ✍️ *Personnalisé*).
  - Compteur dynamique de 280 caractères avec indicateur visuel de dépassement.
  - Puces de hashtags cliquables (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`, `#GCP`, `#SQL`).
  - Bouton **Post on X / Twitter** ouvrant directement l'interface Twitter Web Intent.
- ⚡ **Performance & Cache** : Système de cache serveur en mémoire (TTL 10 min) pour des réponses API ultra-rapides (< 10 ms).

---

## 🛠 Architecture & Technologies

### Backend
- **Python 3.11+** & **Flask 3.1**
- **BeautifulSoup4** : Parsing et nettoyage du contenu HTML des entrées RSS.
- **xml.etree.ElementTree** : Ingestion du flux XML Atom.

### Frontend
- **HTML5 & Vanilla CSS3** : Système de design moderne sombre (Google Cloud Slate theme, conteneurs dépolis `backdrop-filter`, animations fluides).
- **Vanilla JavaScript (ES6+)** : Gestion réactive de l'état, de la recherche, des filtres et de la modale sans dépendance externe.

---

## 🚀 Installation & Démarrage / Quick Start

### Prérequis
- Python 3.10 ou supérieur installé sur votre système.
- Git.

### 1. Cloner le projet
```bash
git clone https://github.com/armelBiloo/Armel-biloo-event-talks-app.git
cd Armel-biloo-event-talks-app
```

### 2. Créer et activer un environnement virtuel
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 4. Lancer l'application
```bash
python app.py
```

Ouvrez votre navigateur web sur : **`http://127.0.0.1:5000`**

---

## 📡 Documentation des API / API Endpoints

### `GET /api/notes`
Renvoie la liste structurée des notes de version BigQuery.

* **Paramètres de requête** :
  * `refresh=true` *(optionnel)* : Force le téléchargement d'une nouvelle version du flux Google Cloud.
* **Exemple de réponse** :
```json
{
  "success": true,
  "data": {
    "title": "BigQuery - Release notes",
    "last_refreshed_at": "Aug 13, 2026 03:59:35 UTC",
    "total_entries": 30,
    "total_items": 65,
    "category_counts": {
      "Feature": 51,
      "Announcement": 4,
      "Change": 7,
      "Issue": 2,
      "Security": 1
    },
    "entries": [...]
  }
}
```

---

### `POST /api/tweet/intent`
Génère une URL d'intention Twitter encodée et valide le texte.

* **Corps de la requête (JSON)** :
```json
{
  "text": "Check out this BigQuery feature update!",
  "hashtags": ["BigQuery", "GoogleCloud"],
  "url": "https://docs.cloud.google.com/bigquery/docs/release-notes"
}
```
* **Exemple de réponse** :
```json
{
  "success": true,
  "tweet_text": "Check out this BigQuery feature update!\n\n#BigQuery #GoogleCloud",
  "character_count": 60,
  "is_over_limit": false,
  "intent_url": "https://twitter.com/intent/tweet?text=..."
}
```

---

## 📂 Structure du Projet / Project Structure

```text
bq-releases-notes/
├── app.py                  # Serveur Flask backend & parseur RSS XML
├── requirements.txt        # Dépendances Python
├── .gitignore              # Ignorer .venv, __pycache__, logs
├── README.md               # Documentation du projet
├── static/
│   ├── css/
│   │   └── style.css       # Styles CSS Vanilla & Thème sombre
│   └── js/
│       └── app.js          # Logique JS client, filtres & modale Tweet
└── templates/
    └── index.html          # Template HTML5 principal
```

---

## 👨‍💻 Auteur & Licence / Author & License

Développé par **[armelBiloo](https://github.com/armelBiloo)**.

Sous licence [MIT](LICENSE). Libre d'utilisation et de modification.
