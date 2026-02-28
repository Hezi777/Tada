# MVP Spec

## Goal

User uploads a data file → Gets an intelligent dashboard within seconds → Can ask questions and modify charts via chat.

**We prove:** Upload = Instant insights.

---

## Target User

Non-technical people with data files who want quick insights:
- Freelancers
- Managers
- Small business owners

---

## User Flow

```
Upload File → Dashboard Generated → Chat to Ask/Modify → Get Insights
```

---

## MVP Scope

### ✅ What’s Included

**File Input**
- CSV and Excel only
- One file at a time

**Dashboard**
- 3-5 basic charts (Line, Bar, Pie, Table)
- Single-page view
- Show/hide charts

**Chat Features**
- Answer questions about the data
- Explain trends
- Add/remove charts
- Modify existing charts

### ❌ Not in MVP

- PDF support
- External data connections
- Automation
- Multi-user / permissions
- Saved dashboards
- Advanced analytics
- Validation layer (comes in v2)

---

## Success Metrics

- User understands dashboard in < 3 minutes
- User asks at least 2 chat questions
- User adds or removes a chart via chat

---

## Demo Flow (3 min)

1. Upload file
2. Dashboard auto-generates
3. Ask a question in chat
4. Modify dashboard via chat

---

## MVP Backend Flow (Simplified)

### 1. `/upload` (POST)

- User uploads CSV/Excel
- Extract basic metadata (columns, types, samples)
- Send to LLM → Get chart suggestions
- Return dashboard JSON

### 2. `/chat` (POST)

- Receive user message + current dashboard
- Send to LLM for interpretation
- LLM returns action (question/add/remove/update)
- Update dashboard
- Return updated state

**Key:** No validation layer yet - LLM output goes directly to dashboard

---

## Tech Stack

- **LLM + Flow:** Windsurf
- **Data + Charts:** Python (Cursor)
- **UI:** Lovable

---

## UX Principles

- Zero setup
- Everything on one page
- Self-explanatory (no tutorial needed)
- Fast feedback

---

## Development Checklist

- [x]  File upload and parsing
- [x]  Basic data profiling
- [x]  LLM integration for chart suggestions
- [x]  Dashboard state management
- [ ]  Chat endpoint
- [x]  Frontend dashboard display
- [x]  Chart show/hide functionality