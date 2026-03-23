# ⬡ DocIntel Studio  
### Azure Document Intelligence UI (Modern Web Interface)

DocIntel Studio is a **modern, terminal-inspired web application** built using pure HTML, CSS, and JavaScript to interact with **Azure Document Intelligence** APIs.

It provides a **clean, animated UI** for analyzing documents and extracting structured data such as text, tables, and key-value pairs — all in real time.

---

## 🚀 Features

### ⚙️ Configuration Panel
- Input Azure **Endpoint** and **API Key**
- Document URL input
- Prebuilt model selection:
  - Layout (General)
  - Invoice
  - Receipt
  - ID Document
  - Business Card
  - Read (OCR)

---

### 📊 Smart Analysis Engine
- Supports latest Azure API versions with **auto fallback**
- Polling-based result retrieval system
- Real-time status updates:
  - IDLE
  - ANALYZING
  - SUCCESS
  - ERROR

---

### 📈 Results Dashboard
- 📄 Page count
- 📊 Table detection
- 🔑 Key-value extraction
- 🔤 Word count
- 📉 Confidence score visualization

---

### 🧠 Data Visualization Tabs
- 📝 Extracted Text (page-wise)
- 📊 Tables (structured rendering)
- 🔑 Key-Value pairs
- `{ }` Raw JSON output (copy enabled)

---

### 🎨 UI/UX Highlights
- Dark **AI-lab / terminal theme**
- Animated scanlines + glowing effects
- Responsive layout
- Interactive components (tabs, collapsible tables)
- Built with **zero frameworks** (pure vanilla JS)

---

## 🛠️ Tech Stack

- HTML5  
- CSS3 (custom animations, gradients, UI effects)  
- Vanilla JavaScript (ES6+)  
- Azure Document Intelligence REST API  

---

## 📂 Project Structure

```
├── index.html     # Main UI layout and structure
├── styles.css     # Styling, animations, theme
├── app.js         # Core logic (API calls, rendering, state)
```

---

## 🔧 How It Works

1. User enters:
   - Azure Endpoint  
   - API Key  
   - Document URL  

2. Click **"Analyze Document"**

3. App:
   - Sends request to Azure API
   - Handles multiple API versions (fallback mechanism)
   - Polls for result using `operation-location`

4. Displays:
   - Structured extracted data
   - Analytics + visualization

---

## ▶️ Usage

1. Open `index.html` in browser  
2. Enter:
   - Endpoint → `https://<your-resource>.cognitiveservices.azure.com`
   - API Key → Your Azure key  
   - Document URL → Public file URL  

3. Select model  
4. Click **ANALYZE DOCUMENT**

---

## ⚠️ Security Warning

This project sends the API key directly from the browser.

👉 Not recommended for production.

### Recommended:
- Use a backend (Node.js / Express)
- Store keys in environment variables
- Create a secure API proxy

---

## 🔄 API Handling Strategy

The app intelligently tries multiple API versions:

1. `2024-11-30 (GA)`
2. `2024-02-29-preview`
3. `2023-07-31 (legacy)`

This ensures compatibility across different Azure resources.

---

## 📸 UI Preview

<img width="1919" height="812" alt="image" src="https://github.com/user-attachments/assets/2d5d8891-9dac-42ac-809a-8eb4cc7cc276" />


---

## 🌱 Future Improvements

- Drag & drop file upload  
- Backend integration for security  
- Authentication system  
- Multi-file batch processing  
- Export results (CSV / PDF)  
- Deployment (Azure / Vercel / Netlify)  

---

## 👨‍💻 Author

Shashank  

---

## ⭐ Contribution

Pull requests are welcome. For major changes, open an issue first.

---

## 📜 License

This project is open-source and available under the MIT License.
