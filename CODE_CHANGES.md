# Code Changes Reference

## Files Modified: 3 files

---

## 1. `app/page.tsx` - Main Dashboard Page

### **Status:** ✅ MODIFIED (Layout Restructured)

### **Key Changes:**

#### Import Statements (Added)
```javascript
import { Sidebar, SidebarHeader, SidebarNav, SidebarItem, SidebarUserCard, MobileMenuButton } from '@/components/ui';
```

#### State Management (Added)
```javascript
const [sidebarOpen, setSidebarOpen] = useState(false);
```

#### Layout Structure

**Before:**
```
┌─────────────────────────────────────────────────┐
│ [Logo] [Master ASSY] [Master Part] ... [Logout] │  ← Top Navbar
├─────────────────────────────────────────────────┤
│                                                 │
│                  Main Content                   │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**After:**
```
┌─────┬───────────────────────────────────────────┐
│ [☰] │ BOM Database (Mobile Header)              │  ← Mobile Header
├─────┴───────────────────────────────────────────┤
│ ║                                               │
│ ║  Sidebar (260px)    Main Content Area         │
│ ║  - Master ASSY      - Master ASSY Page       │
│ ║  - Master Part      - Master Part Page       │
│ ║  - Master BOM       - Master BOM Page        │
│ ║  - Prod Plan        - Prod Plan Page         │
│ ║  - Report                                     │
│ ║  ─────────────      ─────────────────        │
│ ║  [User Card]                                  │
│ ║  [🚪 Logout]                                  │
└─────┴───────────────────────────────────────────┘
```

#### Main Container Changes
```javascript
// Background: Putih (#fff) pada outer div
// Background: Light gray (#f8f9fa) pada main content
// Display: Flex layout dengan flexDirection column
// Height: Min 100vh untuk full viewport
```

#### Sidebar Implementation
```javascript
<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
  <SidebarHeader />
  <SidebarNav>
    {tabs.map(t => (
      <SidebarItem
        key={t.key}
        label={t.label}
        icon={t.icon}
        active={page === t.key}
        onClick={() => {
          setPage(t.key);
          setSidebarOpen(false);
        }}
      />
    ))}
    <SidebarItem label="Report" icon="📊" ... />
  </SidebarNav>
  <SidebarUserCard
    userName={userName}
    role={role}
    onLogout={() => signOut({ callbackUrl: '/login' })}
  />
</Sidebar>
```

#### Mobile Header (Hidden on Desktop)
```javascript
<header style={{ display: 'none' /* shown on <1024px */ }}>
  <div>BOM Database</div>
  <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
</header>
```

#### Main Content Area
```javascript
<div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
  <main style={{
    flex: 1,
    padding: '28px 24px',
    overflowY: 'auto',
    background: '#f8f9fa'
  }}>
    {/* Page content based on active tab */}
  </main>
</div>
```

### **Lines Changed:** ~120 lines (completely restructured, same functionality)

---

## 2. `components/ui.tsx` - UI Component Library

### **Status:** ✅ MODIFIED (New Components Added)

### **New Components Added (Lines 418-619)**

#### 1. **Sidebar Component**
```javascript
export function Sidebar({ isOpen, onClose, children }) {
  // Features:
  // - Fixed position on mobile
  // - Relative position on desktop (1024px+)
  // - Smooth slide transition
  // - Overlay backdrop on mobile
  // - 260px width, full height
}
```

**Props:**
- `isOpen` (boolean) - Toggle sidebar visibility
- `onClose` (function) - Close handler
- `children` (ReactNode) - Sidebar content

**Styling:**
- Background: #fff
- Border: 1px solid #e8eaed
- Shadow: 0 4px 12px rgba(0,0,0,.04)
- Transform: translateX(-100%) when closed
- Transition: .3s ease-out

#### 2. **SidebarHeader Component**
```javascript
export function SidebarHeader() {
  // Shows BOM Database logo with icon
  // Displays "Master Data" subtitle
}
```

**Layout:**
- Logo icon (38x38px) dengan gradient blue
- Text stacked vertically
- Border-bottom divider

#### 3. **SidebarNav Component**
```javascript
export function SidebarNav({ children }) {
  // Container untuk navigation items
  // Flex column layout dengan gap
}
```

#### 4. **SidebarItem Component**
```javascript
export function SidebarItem({ 
  label, icon, active, onClick 
}) {
  // Features:
  // - Icon + label display
  // - Active state dengan left blue border
  // - Hover effect
  // - Smooth transitions
}
```

**Active State:**
- Background: #eff6ff (primaryLight)
- Border: 1.5px solid #2563eb (primary)
- Text color: #2563eb (primary)
- Right indicator: 2px blue bar

**Hover State (Inactive):**
- Background: #f9fafb (gray50)
- Text color: #111827 (gray900)

#### 5. **SidebarUserCard Component**
```javascript
export function SidebarUserCard({ 
  userName, role, onLogout 
}) {
  // Shows user avatar + name + role
  // Logout button terintegrasi
}
```

**Features:**
- Avatar dengan initial huruf
- Role-specific color coding (MPC, PPC, DESIGN, FINANCE)
- Background color per role
- Logout button dengan hover effect

**Role Colors:**
- MPC: #2563eb (blue)
- PPC: #16a34a (green)
- DESIGN: #9333ea (purple)
- FINANCE: #d97706 (orange)

#### 6. **MobileMenuButton Component**
```javascript
export function MobileMenuButton({ onClick }) {
  // Simple hamburger menu button
  // ☰ icon
  // Hover effect dengan gray background
}
```

### **Design Tokens Used**
```javascript
const tokens = {
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  success: '#16a34a',
  gray50: '#f9fafb',
  gray600: '#4b5563',
  gray900: '#111827',
  border: '#e8eaed',
  radiusSm: 7,
  radiusLg: 14,
  shadow: '0 1px 3px rgba(0,0,0,.06)...',
};
```

### **Lines Added:** 202 lines (418-619)

---

## 3. `app/globals.css` - Global Styles

### **Status:** ✅ MODIFIED (Enhanced Responsive Styling)

### **Key Changes:**

#### HTML/Body Setup
```css
html, body, #__next {
  width: 100%;
  height: 100%;
}

body {
  background-color: #f8f9fa;
  font-family: 'DM Sans', system-ui, sans-serif;
}
```

#### Responsive Sidebar Media Queries
```css
/* Mobile & Tablet: Sidebar hidden by default */
@media (max-width: 1023px) {
  aside {
    display: none;
    width: 260px;
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 40;
  }
  
  /* Show sidebar ketika open */
  aside[style*="translateX(0)"] {
    display: flex;
  }
}

/* Desktop: Sidebar always visible */
@media (min-width: 1024px) {
  aside {
    display: flex !important;
    position: relative !important;
    transform: translateX(0) !important;
    width: 260px;
  }
  
  header {
    display: none !important;
  }
}
```

#### Smooth Scrolling & Scrollbar
```css
html {
  scroll-behavior: smooth;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
```

#### Input & Text Selection
```css
input::placeholder,
select::placeholder,
textarea::placeholder {
  color: #9ca3af;
}

::selection {
  background-color: #bfdbfe;
  color: #1e3a8a;
}
```

### **Lines Changed:** ~80 lines

---

## Summary of Changes

| File | Changes | Lines | Impact |
|------|---------|-------|--------|
| `app/page.tsx` | Layout restructure, sidebar integration | ~120 | HIGH - Visual redesign |
| `components/ui.tsx` | 6 new components | +202 | HIGH - New UI elements |
| `app/globals.css` | Responsive + styling rules | ~80 | MEDIUM - Responsive behavior |

---

## What Stayed the Same

### ✅ Unchanged Components
- `MasterAssyPage.tsx`
- `MasterPartPage.tsx`
- `MasterBomPage.tsx`
- `ProdPlanPage.tsx`
- `BomDetailModal.tsx`
- `PartPriceModal.tsx`
- `TotalUsageModal.tsx`
- `BomGabunganModal.tsx`
- `Providers.tsx`

### ✅ Unchanged Functionality
- All CRUD operations
- API routes
- Authentication
- Data validation
- Business logic
- Database operations

### ✅ Existing UI Components (Still Available)
- Badge, Modal, Field, Input, Select
- BtnPrimary, BtnGhost, ConfirmDialog
- LoadingSpinner, StatCard, Table, Pagination

---

## Responsive Behavior

### **Mobile View (<768px)**
- Sidebar: Hidden, toggle via hamburger button
- Header: Visible dengan mobile menu
- Padding: Reduced (24px instead of 40px)
- Content: Full width available

### **Tablet View (768px - 1023px)**
- Sidebar: Hidden by default, collapsible
- Header: Visible dengan mobile menu
- Content: Full width when sidebar closed

### **Desktop View (≥1024px)**
- Sidebar: Always visible (fixed 260px width)
- Header: Hidden (mobile header not needed)
- Content: Calculated width minus sidebar
- Layout: Stable 2-column layout

---

## Browser DevTools Tips

### Test Responsive Design
```
Chrome DevTools → F12 → Toggle Device Toolbar (Ctrl+Shift+M)
- Test at mobile (375px)
- Test at tablet (768px)
- Test at desktop (1024px+)
```

### Debug Sidebar Toggle
```javascript
// Check sidebar state in Console
// Should show toggle when opening DevTools mobile view
```

---

## Performance Notes

✅ **Optimizations Implemented:**
- CSS transitions (hardware accelerated)
- Smooth scroll behavior
- Efficient responsive design
- No unnecessary re-renders
- Semantic HTML structure

✅ **No Impact To:**
- API performance
- Database queries
- Authentication flow
- Data processing

---

## Notes for Future Development

1. **Adding new menu items:** Edit `tabs` array in `app/page.tsx`
2. **Changing sidebar width:** Update `width: 260` in Sidebar and globals.css
3. **Adjusting breakpoints:** Update `1024px` in globals.css and page.tsx media queries
4. **Customizing colors:** Update tokens in `components/ui.tsx`
5. **Responsive tweaks:** Edit `@media` rules in `app/globals.css`

---

## Testing Checklist

- [ ] Desktop view: Sidebar always visible
- [ ] Tablet view: Hamburger menu toggles sidebar
- [ ] Mobile view: Hamburger menu toggles sidebar
- [ ] All page navigation works
- [ ] Logout from sidebar works
- [ ] Toast notifications display correctly
- [ ] Responsive padding looks good
- [ ] No console errors or warnings
- [ ] All CRUD operations unchanged
- [ ] API calls work as before

