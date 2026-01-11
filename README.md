# Vision Test Site

A React-based testing ground for validating visual AI models' ability to identify, navigate, and interact with web interfaces.

## Purpose

This site is designed to test whether visual AI models can:
- **Identify UI elements** - Buttons, forms, navigation, media players, etc.
- **Navigate pages** - Understand different page layouts and structures
- **Extract data** - Recognize and parse tables, lists, and structured content
- **Act autonomously** - Simulate human browsing behavior

## How It Works

### The OmniParser Approach

Visual models **cannot guess pixel coordinates** from images alone. Instead, this site uses a DOM scanning approach similar to Microsoft's OmniParser:

1. **DOM Scanner** analyzes the page structure
2. **Labels elements** with numbers (#1, #2, #3...)
3. **Generates bounding boxes** with precise coordinates
4. **Screenshot** is taken with numbered labels visible
5. **VL Model** references elements by number ("Element #5 is a submit button")

### Workflow

```
┌──────────────────┐
│ Click "Scan Page"│  ← Parses DOM, finds interactive elements
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Elements Labeled│  ← #1, #2, #3... with bounding boxes
│   with Numbers   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Take Screenshot │  ← Capture page with visible labels
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Send to VL Model│  ← "What is element #5?"
│                  │     "Click on element #2"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Model References │  ← Uses numbers, not coordinates
│  by Element #    │     More reliable than pixel guessing
└──────────────────┘
```

The site includes 4 distinct pages with varying UI complexity:

- **Landing Page** (`/`) - Hero sections, CTA buttons, feature cards, stats
- **Dashboard** (`/dashboard`) - Sidebar navigation, metrics, charts, data tables
- **Form Page** (`/form`) - Various input types, checkboxes, radio buttons, dropdowns
- **Media Page** (`/media`) - Video players, image galleries, audio controls

### Element Detection

The DOM scanner automatically detects:
- Buttons and links
- Form inputs (text, checkbox, radio, select)
- Interactive elements (video, audio, images)
- Clickable areas ([onclick], [role="button"])
- Labels and form controls

Each element gets:
- **Unique number** (#1, #2, etc.)
- **Bounding box** (x, y, width, height)
- **Element info** (tag, text, type, attributes)

The control panel accepts JSON in this format:

```json
{
  "boxes": [
    {
      "x": 50,
      "y": 100,
      "w": 150,
      "h": 40,
      "guess": "Login Button",
      "confidence": 0.95
    },
    {
      "x": 300,
      "y": 50,
      "w": 60,
      "h": 60,
      "guess": "User Avatar",
      "confidence": 0.88
### JSON Output Format

After scanning, the system generates JSON like this:

```json
{
  "elements": [
    {
      "id": 1,
      "x": 50,
      "y": 100,
      "w": 150,
      "h": 40,
      "tag": "button",
      "text": "Login",
   id` - Element number for reference (#1, #2, etc.)
- `x`, `y` - Top-left corner coordinates (pixels from top-left of viewport)
- `w`, `h` - Width and height of bounding box
- `tag` - HTML tag name (button, input, a, etc.)
- `text` - Visible text content (if any)
- `type` - Input type (text, email, checkbox, etc.)
- `placeholder`, `href`, `className` - Other relevant attributes
### Visual Display

Elements are highlighted with:
- **Numbered badge** (circle with #) in top-left corner
- **Bounding box** around the element
- **Label** showing element type and text
- **Green color** for detected elements

This creates a visual map that both humans and AI models can reference.
      "type": "email",
      "placeholder": "Enter email"
    }
  ]
} Install dependencies
npm install

# Start development server
npm run dev
```

The Automated Scanning (Recommended)

1. Navigate to a test page
2. Click **"🔍 Scan & Label Elements"** in the control panel
3. All interactive elements are automatically detected and labeled (#1, #2, #3...)
4. Take a screenshot (Cmd+Shift+4 on Mac, Win+Shift+S on Windows)
5. Send to your VL model with prompts like:
   - "What is element #5?"
   - "Which element would you click to submit the form?"
   - "Describe what you see at element #2"
6. Model responds using element numbers, not coordinates
7. Verify the model's understanding is correct
4. Copy the model's JSON output
5. Paste into the control panel on the right
6. Click "Apply Boxes"
7. Validate: Are the boxes around the right elements?

### Example Prompts
Element Identification**:
> "Looking at the screenshot, what type of element is #7?"

**Navigation Testing**:
> "Which element number would you click to go to the Dashboard?"

**Form Understanding**:
> "List all form input elements and their numbers"

**Action Planning**:
> "To submit this form, which elements would you interact with and in what order?"

**Semantic Understanding**:
> "Is element #3 a primary or secondary action? How can you tell?"

### Manual JSON Testing (Alternative)
> "What would you click to submit this form?"

## Architecture

```
vision-site/
├── src/
│   ├── components/
│   │   ├── Layout.jsx              # Main layout with nav + control panel
│   │   ├── BoundingBoxOverlay.jsx  # SVG overlay for drawing boxes
│   │   └── ControlPanel.jsx        # JSON input and controls
│   ├── pages/
│   │   ├── LandingPage.jsx         # Hero, cards, CTAs
│   │   ├── DashboardPage.jsx       # Sidebar, metrics, tables
│   │   ├── FormPage.jsx            # Form inputs, validation
│   │   └── MediaPage.jsx           # Video, images, audio
│   ├── App.jsx                     # Router + state management
│   └── main.jsx                    # Entry point
├── package.json
└── vite.config.js
```

## Use Cases

### 1. Element Detection Accuracy
Test if the model can correctly identify:
- Different button styles
- Form inputs vs. labels
- Navigation links vs. regular text
- Interactive vs. static elements

### 2. Layout Understanding
Verify the model understands:
- Nested structures (cards within sections)
- Hierarchical navigation (sidebar menus)
- Grouped elements (form fields)

### 3. Context Awareness
Check if the model can:
- Distinguish primary vs. secondary actions
- Identify required vs. optional fields
- Recognize semantic meaning (submit buttons, cancel links)

### 4. Data Extraction
Validate the model's ability to:
- Parse table rows and columns
- Extract metrics from dashboards
- Identify key-value pairs in structured layouts

## Extending the Site

### Adding New Test Pages

1. Create a new component in `src/pages/`
2. Add the route in `src/App.jsx`
3. Add navigation link in `src/components/Layout.jsx`

### Customizing Bounding Box Display

Edit `src/components/BoundingBoxOverlay.jsx` to change:
- Colors
- Label format
- Border styles
- Animations

## Future Enhancements

- [ ] Screenshot capture built-in
- [ ] Direct MCP integration
- [ ] Validation mode (expected vs. actual boxes)
- [ ] Performance metrics dashboard
- [ ] Test case library with gold-standard annotations
- [ ] Automated testing suite

---

**Built for visual AI model validation**
